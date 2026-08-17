import { randomBytes } from "crypto";
import { Request, Response } from "express";
import EmbedIntegration from "../models/EmbedIntegration";
import User from "../models/User";
import AppError from "../errors/AppError";
import { createEmbedAccessToken } from "../helpers/CreateTokens";
import { SerializeUser } from "../helpers/SerializeUser";
import { updateActivity } from "../libs/sessionManager";
import { getIO } from "../libs/socket";
import {
  createIntegration,
  listIntegrations,
  removeIntegration,
  rotateIntegration,
  updateIntegration
} from "../services/EmbedServices/EmbedIntegrationService";
import {
  isValidEmbedToken,
  normalizeEmbedPath,
  normalizeOrigin
} from "../services/EmbedServices/EmbedSecurity";

const htmlEscape = (value: string): string =>
  value.replace(
    /[&<>'"]/g,
    character =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
      }[character] as string)
  );

export const index = async (_req: Request, res: Response): Promise<Response> =>
  res.json(await listIntegrations());

export const users = async (
  _req: Request,
  res: Response
): Promise<Response> => {
  const availableUsers = await User.findAll({
    attributes: ["id", "name", "email", "profile"],
    order: [["name", "ASC"]]
  });
  return res.json(availableUsers);
};

export const store = async (req: Request, res: Response): Promise<Response> =>
  res.status(201).json(await createIntegration(req.body, Number(req.user.id)));

const disconnectIntegration = (publicId: string): void => {
  try {
    const room = getIO().in(`embed:${publicId}`);
    room.emit("embed:revoked");
    room.disconnectSockets(true);
  } catch (_error) {
    // Socket server is not initialized in migrations and isolated tests.
  }
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const integration = await updateIntegration(
    Number(req.params.integrationId),
    req.body
  );
  disconnectIntegration(integration.publicId);
  return res.json(integration);
};

export const rotate = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const integration = await rotateIntegration(Number(req.params.integrationId));
  disconnectIntegration(integration.publicId);
  return res.json(integration);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const publicId = await removeIntegration(Number(req.params.integrationId));
  disconnectIntegration(publicId);
  return res.status(204).send();
};

export const exchange = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const integration = await EmbedIntegration.findOne({
    where: { publicId: req.params.publicId, enabled: true },
    include: [{ model: User, as: "user", include: ["queues"] }]
  });
  if (!integration) throw new AppError("ERR_EMBED_INTEGRATION_NOT_FOUND", 404);

  const parentOrigin = normalizeOrigin(String(req.body.parentOrigin || ""));
  const allowedOrigins = Array.isArray(integration.allowedOrigins)
    ? integration.allowedOrigins
    : JSON.parse(String(integration.allowedOrigins));
  if (!allowedOrigins.includes(parentOrigin)) {
    throw new AppError("ERR_EMBED_ORIGIN_NOT_ALLOWED", 403);
  }
  if (
    !isValidEmbedToken(
      String(req.body.token || ""),
      integration.publicId,
      integration.secretVersion
    )
  ) {
    throw new AppError("ERR_INVALID_EMBED_TOKEN", 401);
  }

  const next = normalizeEmbedPath(req.body.next || integration.defaultPath);
  const { user } = integration;
  if (!user) throw new AppError("ERR_NO_USER_FOUND", 404);

  const token = createEmbedAccessToken(
    user,
    integration.publicId,
    integration.secretVersion
  );
  updateActivity(user.id);
  await Promise.all([
    user.update({ online: true }),
    integration.update({ lastUsedAt: new Date() })
  ]);

  return res.json({ token, user: SerializeUser(user), next });
};

export const shell = async (req: Request, res: Response): Promise<Response> => {
  const integration = await EmbedIntegration.findOne({
    where: { publicId: req.params.publicId, enabled: true }
  });
  if (!integration) return res.status(404).send("Embed integration not found");

  const allowedOrigins = Array.isArray(integration.allowedOrigins)
    ? integration.allowedOrigins
    : JSON.parse(String(integration.allowedOrigins));
  const frontendOrigin = new URL(
    process.env.FRONTEND_URL || "http://localhost:3000"
  ).origin;
  const nonce = randomBytes(18).toString("base64");
  const publicId = htmlEscape(integration.publicId);
  const iframeSrc = `${frontendOrigin}/embed/session/${publicId}`;

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'none'; frame-ancestors ${allowedOrigins.join(
      " "
    )}; frame-src ${frontendOrigin}; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'`
  );
  res.removeHeader("X-Frame-Options");

  return res.send(`<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${htmlEscape(integration.name)}</title>
<style nonce="${nonce}">html,body,iframe{border:0;margin:0;width:100%;height:100%;overflow:hidden}#error{display:none;padding:24px;font:16px sans-serif;color:#b71c1c}</style></head>
<body><div id="error"></div><iframe id="app" title="${htmlEscape(
    integration.name
  )}" src="${iframeSrc}"></iframe>
<script nonce="${nonce}">(()=>{const frame=document.getElementById("app");const error=document.getElementById("error");
const showError=m=>{frame.style.display="none";error.style.display="block";error.textContent=m};
if(window.self===window.top){showError("Esta URL solamente puede abrirse dentro de un iframe.");return}
let parentOrigin="";try{parentOrigin=new URL(document.referrer).origin}catch(e){}
const parameters=new URLSearchParams(location.hash.slice(1));const token=parameters.get("token");const next=parameters.get("next");
if(!token||!parentOrigin){showError("No se pudo validar el dominio o la credencial de acceso.");return}
const target=${JSON.stringify(frontendOrigin).replace(/</g, "\\u003c")};
const send=()=>frame.contentWindow.postMessage({type:"WHAPI_EMBED_AUTH",token,parentOrigin,next},target);
frame.addEventListener("load",send);window.addEventListener("message",event=>{if(event.origin===target&&event.source===frame.contentWindow&&event.data&&event.data.type==="WHAPI_EMBED_READY")send()});})();</script></body></html>`);
};
