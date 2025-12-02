const messages = {
  es: {
    translations: {
      signup: {
        title: "Registrarse",
        toasts: {
          success: "¡El asistente se creó correctamente! ¡Inicia sesión!",
          fail: "Error al crear el asistente. Verifique los datos ingresados.",
        },
        form: {
          name: "Nombre",
          email: "Correo electrónico",
          password: "Contraseña",
        },
        buttons: {
          submit: "Registrarse",
          login: "¿Ya tienes una cuenta? ¡Inicia sesión!",
        },
      },
      Login: {
        title: "Iniciar sesión ahora",
        form: {
          email: "Ingrese correo electrónico",
          password: "Ingrese su contraseña",
        },
        buttons: {
          submit: "Iniciar sesión",
          register: "¿No tienes una cuenta? ¡Regístrate!",
        },
      },
      auth: {
        toasts: {
          success: "¡El inicio de sesión fue exitoso!",
        },
      },
      messageVariablesPicker: {
        label: "Variables disponibles",
        vars: {
          contactFirstName: "Primer nombre",
          contactName: "Nombre",
          user: "Asistente",
          greeting: "Saludo",
          protocolNumber: "Protocolo",
          date: "Data",
          hour: "Hora",
          ticket_id: "Ticked ID",
          queue: "Sector",
          connection: "Conexión"
        }
      },
      dashboard: {
        charts: {
          perDay: {
            title: "Conversaciones de hoy:",
            titleAll: "Todos os Chamados: ",
          },
        },
        messages: {
          inAttendance: {
            title: "En asistencia"
          },
          waiting: {
            title: "Esperando"
          },
          closed: {
            title: "Resuelto"
          }
        }
      },
      connections: {
        title: "Conexiones",
        toasts: {
          deleted: "¡La conexión de WhatsApp se eliminó correctamente!",
          restarted: "¡La sesión de WhatsApp se reinició correctamente!",
        },
        confirmationModal: {
          deleteTitle: "Eliminar",
          deleteMessage: "¿Estás seguro? Esta acción no se puede revertir.",
          disconnectTitle: "Desconectar",
          disconnectMessage: "¿Estás seguro? Deberás escanear el código QR nuevamente.",
        },
        buttons: {
          add: "Agregar WhatsApp",
          disconnect: "desconectar",
          tryAgain: "Intentar de nuevo",
          qrcode: "CÓDIGO QR",
          newQr: "Nuevo CÓDIGO QR",
          connecting: "Conectando",
          restart: "Reiniciar",
          edit: "Editar",
          delete: "Eliminar",
        },
        empty: {
          title: "No hay conexiones",
          message: "Agrega una conexión de WhatsApp para comenzar",
        },
        toolTips: {
          disconnected: {
            title: "Error al iniciar sesión en WhatsApp",
            content: "Asegúrese de que su teléfono celular esté conectado a Internet y vuelva a intentarlo, o solicite un nuevo Código QR",
          },
          qrcode: {
            title: "Esperando para leer el código QR",
            content: "Haga clic en el botón 'CÓDIGO QR' y escanee el código QR con su teléfono celular para iniciar sesión.",
          },
          connected: {
            title: "¡Conexión establecida!",
          },
          timeout: {
            title: "Se perdió la conexión con el celular",
            content: "Asegúrese de que su móvil esté conectado a Internet y WhatsApp esté abierto, o haga clic en el botón 'Desconectar' para obtener un nuevo código QR",
          },
        },
        table: {
          id: "ID de instancia",
          name: "Nombre",
          number: "Número",
          status: "Estado",
          lastUpdate: "Última actualización",
          default: "Predeterminado",
          actions: "Acciones",
          session: "Sesión",
        },
      },
      whatsappModal: {
        title: {
          add: "Agregar WhatsApp",
          edit: "Editar WhatsApp",
        },
        form: {
          name: "Nombre",
          default: "Predeterminado",
          display: "Mostrar hora del sector",
          farewellMessage: "Mensaje de despedida",
          ratingMessage: "Mensaje de evaluación",
          sendInactiveMessage: "Cerrar ticket automáticamente",
          timeInactiveMessage: "Hora de finalizar la respuesta automática",
          inactiveMessage: "Mensaje de cierre automático del ticket",
          instructionRatingMessage: "Para habilitar las evaluaciones, simplemente complete este campo",
          outOfWorkMessage: "Personaliza el mensaje cuando estés fuera del horario de oficina",
          startWorkHour: "Abierto",
          endWorkHour: "Cerrado",
          startWorkHourLunch: "Almuerzo de inicio",
          endWorkHourLunch: "Almuerzo cerrado",
          monday: "Lunes",
          tuesday: "Martes",
          wednesday: "Miércoles",
          thursday: "Jueves",
          friday: "Viernes",
          saturday: "Sábado",
          sunday: "Domingo",
          holiday: "Día festivo",
          defineHourExpedient: "Establecer horario de oficina",
          longText: "Marque esta opción para establecer el horario de oficina para las citas.",
          token: "Token",
          checkHourExpedient: "Consultar Horario de Oficina",
          group: "Recibir Mensaje de Grupo",
          archiveOnClose: "Archivar chat",
          queues: "Colas",
          queuesDescription: "Selecciona las colas a las que se asignarán los tickets de esta conexión.",
          // Webhook configuration
          webhookEnabled: "Habilitar Webhooks",
          webhooksTitle: "Webhooks",
          webhooksDescription: "Configura múltiples webhooks para enviar eventos a diferentes sistemas (n8n, Make, Zapier, etc.)",
          webhookUrl: "URL del Webhook",
          webhookUrlHelper: "URL a la que se enviarán los eventos (POST)",
          webhookName: "Nombre del Webhook",
          addWebhook: "Agregar Webhook",
          noWebhooks: "No hay webhooks configurados. Haz clic en 'Agregar Webhook' para crear uno.",
          noUrlConfigured: "(sin URL configurada)",
          webhookPayloadExample: "Ejemplo de payload (mensaje con media)",
          webhookEvents: "Eventos a enviar",
          webhookEventsHelper: "Selecciona los eventos que deseas recibir en tu webhook",
          webhookEventMessageReceived: "Mensaje recibido",
          webhookEventMessageSent: "Mensaje enviado",
          webhookEventMessageAck: "Confirmación de mensaje (ACK)",
          webhookEventConnectionUpdate: "Actualización de conexión",
          webhookEventTicketCreated: "Ticket creado",
          webhookEventTicketUpdated: "Ticket actualizado",
          webhookEventTicketClosed: "Ticket cerrado",
          webhookEventContactCreated: "Contacto creado",
          webhookEventContactUpdated: "Contacto actualizado",
        },
        buttons: {
          okAdd: "Agregar",
          okEdit: "Guardar",
          cancel: "Cancelar",
        },
        success: "WhatsApp se guardó correctamente.",
      },
      qrCode: {
        message: "Lee el QRCode para iniciar sesión",
      },
      contacts: {
        title: "Contactos",
        toasts: {
          deleted: "¡Contacto eliminado con éxito!",
          deletedAll: "¡Todos los contactos se eliminaron con éxito!",
        },
        searchPlaceholder: "Buscar...",
        confirmationModal: {
          deleteTitle: "Eliminar",
          deleteAllTitle: "Borrar todo",
          importTitle: "Importar contactos",
          deleteMessage: "¿Está seguro de que desea eliminar este contacto? Se perderán todos los tickets relacionados.",
          deleteAllMessage: "¿Está seguro de que desea eliminar todos los contactos? Se perderán todos los tickets relacionados.",
          importMessage: "¿Quieres importar todos los contactos del teléfono?",
        },
        buttons: {
          import: "Importar contactos",
          add: "Agregar contacto",
          export: "Exportar contactos",
          delete: "Eliminar todos los contactos"
        },
        table: {
          name: "Nombre",
          whatsapp: "WhatsApp",
          email: "Correo electrónico",
          actions: "Acciones",
        },
      },
      contactModal: {
        title: {
          add: "Agregar contacto",
          edit: "Editar contacto",
        },
        form: {
          mainInfo: "Datos de contacto",
          extraInfo: "Información adicional",
          name: "Nombre",
          number: "Número de WhatsApp",
          email: "Correo electrónico",
          extraName: "Nombre de campo",
          extraValue: "Valor",
        },
        buttons: {
          addExtraInfo: "Añadir información",
          okAdd: "Agregar",
          okEdit: "Guardar",
          cancel: "Cancelar",
        },
        success: "Contacto guardado con exito.",
      },
      quickAnswersModal: {
        title: {
          add: "Agregar respuesta rápida",
          edit: "Editar respuesta rápida",
        },
        form: {
          shortcut: "Atajo",
          message: "Respuesta rápida",
        },
        buttons: {
          okAdd: "Agregar",
          okEdit: "Guardar",
          cancel: "Cancelar",
        },
        success: "Respuesta rápida guardada con éxito.",
      },
      tags: {
        title: "Etiquetas",
        table: {
          id:"ID",
          name: "Etiquetas",
          color: "Color",
          contacts: "Contactos",
          actions: "Acción"
        },
        toasts: {
          download: "Descargar",
          deleted: "¡Etiqueta eliminada con éxito!",
          deletedAll: "¡Todas las etiquetas se eliminaron con éxito!",
        },
        buttons: {
          add: "Agregar",
          deleteAll: "Borrar todo",
        },
        confirmationModal: {
          deleteTitle: "Eliminar ",
          deleteAllTitle: "Borrar todo",
          deleteMessage: "¿Está seguro de que desea eliminar esta etiqueta?",
          deleteAllMessage: "¿Está seguro de que desea eliminar todas las etiquetas?",
        },
      },
      tagModal: {
        title: {
          add: "Agregar etiqueta",
          edit: "Editar etiqueta",
        },
        buttons: {
          okAdd: "Guardar",
          okEdit: "Editar",
          cancel: "Cancelar",
        },
        form: {
          name: "Nombre de la etiqueta",
          color: "Color de la etiqueta"
        },
        success: "¡Etiqueta guardada con éxito!",
      },
      queueModal: {
        title: {
          add: "Crear Sector",
          edit: "Editar Sector",
        },
        notification: {
          title: "¡Sector guardado con éxito!",
        },
        form: {
          name: "Nombre",
          color: "Mensaje de saludo",
          greetingMessage: "Apertura",
          startWork: "Apertura",
          endWork: "Cierre",
          absenceMessage: "Mensaje de ausencia",
          integration: "Integración",
          noIntegration: "Sin integración",
        },
        buttons: {
          okAdd: "Crear",
          okEdit: "Guardar",
          cancel: "Cancelar",
        },
      },
      userModal: {
        title: {
          add: "Crear Asistente",
          edit: "Editar Asistente",
        },
        form: {
          name: "Nombre",
          email: "Correo electrónico",
          password: "Contraseña",
          profile: "Perfil",
          admin: "Administrador",
          whatsapp: "Conexión estándar",
          asistente: "Asistente",
          startWork: "Inicio",
          endWork: "Finalizar",

          allHistoric: "Ver Historiales",
          allHistoricEnabled: "Activado",
          allHistoricDesabled: "Desactivado",

          isRemoveTags: "Eliminar etiquetas",
          isRemoveTagsEnabled: "Activado",
          isRemoveTagsDesabled: "Desactivado",

          viewConection: "Ver conexiones",
          viewConectionEnabled: "Activado",
          viewConectionDesabled: "Desactivado",

          viewSector: "Ver sectores",
          viewSectorEnabled: "Activado",
          viewSectorDesabled: "Desactivado",

          viewName: "Ver nombre",
          viewNameEnabled: "Activado",
          viewNameDesabled: "Desactivado",

          viewTags: "Ver etiquetas",
          viewTagsEnabled: "Activado",
          viewTagsDesabled: "Desactivado",

          allTicket: "Ver entradas sin sector",
          allTicketEnabled: "Activado",
          allTicketDesabled: "Desactivado",
        },
        buttons: {
          okAdd: "Crear",
          okEdit: "Guardar",
          cancel: "Cancelar",
        },
        success: "Asistente guardado con éxito.",
      },
      chat: {
        noTicketMessage: "Seleccione un ticket para comenzar a chatear.",
      },
      uploads: {
        titles: {
          titleUploadMsgDragDrop: "⬇️ ARRASTRA Y SOLTA LOS ARCHIVOS EN EL CAMPO DEBAJO ⬇️",
          titleFileList: "Lista de archivos"
        },
      },
      ticketsManager: {
        buttons: {
          newTicket: "Nuevo",
        },
      },
      ticketsQueueSelect: {
        placeholder: "Sectores",
      },
      tickets: {
        toasts: {
          deleted: "El ticket en el que estabas ha sido eliminado.",
        },
        notification: {
          message: "Mensaje de",
          reaction: "Reacción de",
        },
        tabs: {
          open: { title: "Entrada" },
          closed: { title: "Resuelto" },
          search: { title: "Buscar" },
          group: { title: "Grupos" },
        },
        search: {
          placeholder: "Obtener tickets y mensajes",
        },
        buttons: {
          showAll: "Todos",
        },
      },
      transferTicketModal: {
        title: "transferencia de Conversaciones",
        fieldLabel: "Escriba para obtener Agentes",
        fieldConnectionLabel: "Transferir a conexión",
        fieldQueueLabel: "Transferir a Sector",
        fieldConnectionPlaceholder: "Seleccione una conexión",
        noOptions: "No se encontró ningún asistente con ese nombre",
        buttons: {
          ok: "Transferir",
          cancel: "Cancelar",
        },
      },
      ticketsList: {
        pendingHeader: "Esperando",
        assignedHeader: "Asignado",
        noTicketsTitle: "¡Aquí no hay nada!",
        noTicketsMessage: "No se encontraron conversaciones con este estado o término de búsqueda",
        connectionTitle: "Conexión actualmente en uso.",
        items: {
          queueless: "Sin sector",
          accept: "Aceptar",
          spy: "Espía",
          close: "Cerca",
          reopen: "Reabrir",
          return: "Mover a espera",
          connection: "Conexión",
          user: "Asistente",
          queue: "Sector",
          tags: "Etiquetas"
        },
        buttons: {
          accept: "Responder",
          acceptBeforeBot: "Aceptar",
          start: "empezar",
          cancel: "Cancelar"
        },
        acceptModal: {
          title: "Aceptar chat",
          queue: "Seleccionar sector"
        },
      },
      newTicketModal: {
        title: "Crear una Conversación",
        fieldLabel: "Entrar para buscar contacto",
        add: "Agregar",
        buttons: {
          ok: "Guardar",
          cancel: "Cancelar",
        },
      },
      mainDrawer: {
        listItems: {
          dashboard: "Dashboard",
          connections: "Conexiones",
          tickets: "Conversaciones",
          contacts: "Contactos",
          quickAnswers: "Respuestas rápidas",
          tags: "Etiquetas",
          queues: "Sectores",
          integrations: "Integraciones",
          administration: "Administración",
          users: "Agentes",
          settings: "Configuración",
          sendMsg: "Enviando Mensajes",
          sendMedia: "Enviando medios",
          api: "Uso de la API",
          apidocs: "Documentación",
          apititle: "API",
          apikey: "Clave API",
          token: "Token"
        },
        appBar: {
          message: {
            hi: "Hola",
            text: "bienvenido al Sistema"
          },
          user: {
            profile: "Perfil",
            logout: "Cerrar sesión",
          },
        },
      },
      api: {
        title: "Documentación para envío de mensajes",
        shippingMethods: {
          title: "Métodos de envío",
          text: "Mensaje de texto",
          file: "mensaje de los medios",
        },
        instructions: {
          title: "Instrucciones",
          observations: "Notas importantes ",
          token: "Para obtener el token API, vaya a la configuración y su token estará allí, sin él no será posible enviar mensajes.",
          helpNumber: {
            title: "El número de envío no debe tener máscara ni caracteres especiales y debe constar de:",
            DDI: "DDI - Código de paí - Ex: 34 (Espanha)",
            DDD: "DDD - Codigo de AREA",
            number: "Número",
            queueId: "ID del sector",
            tagsId: "ID de la etiqueta",
            userId: "ID del asistente",
            whatsappId: "ID del WhatsApp",
            body: "Aquí va tu texto",
            medias : "Aquí van tus medios",
            fullNumber: "34654999999."
          },
          exempleText: "A continuación se muestra una lista de la información necesaria para enviar mensajes de texto:",
          exempleFile: "A continuación se muestra una lista de la información necesaria para enviar medios:"
        },

      },
      notifications: {
        noTickets: "Sin notificaciones.",
      },
      queues: {
        title: "Sectores",
        notifications: {
          queueDeleted: "El sector ha sido eliminado.",
        },
        table: {
          id: "ID",
          name: "Nombre",
          color: "Color",
          greeting: "Mensaje de saludo",
          actions: "Acciones",
          startWork: "Apertura",
          endWork: "Cierre",
          schedule: "Horario",
        },
        buttons: {
          add: "Crear Sector",
        },
        confirmationModal: {
          deleteTitle: "Eliminar",
          deleteMessage: "¿Estás seguro? ¡Esta acción no se puede revertir! Los tickets de este sector seguirán existiendo, pero ya no tendrán ningún sector asignado.",
        },
      },
      queueSelect: {
        inputLabel: "Sectores",
      },
      quickAnswers: {
        title: "Respuestas rápidas",
        table: {
          shortcut: "Atajo",
          message: "Respuesta rápida",
          actions: "Acciones",
        },
        buttons: {
          add: "Agregar respuesta rápida",
          deletedAll: "Eliminar todas las respuestas rápidas",
        },
        toasts: {
          deleted: "Respuesta rápida eliminada con éxito.",
          deletedAll: "Todas las respuestas rápidas eliminadas.",
        },
        searchPlaceholder: "Buscar...",
        confirmationModal: {
          deleteTitle: "¿Está seguro de que desea eliminar esta respuesta rápida: ",
          deletedAll: "¿Está seguro de que desea eliminar todas las respuestas rápidas?",
          deleteMessage: "Esta acción no se puede revertir.",
          deleteAllMessage: "Esta acción no se puede revertir.",
        },
      },
      users: {
        title: "Agentes",
        table: {
          id: "ID",
          name: "Nombre",
          email: "Correo electrónico",
          profile: "Perfil",
          whatsapp: "Conexión estándar",
          startWork: "Hora de inicio",
          endWork: "Tiempo de finalización",
          actions: "Acciónes"
        },
        buttons: {
          add: "Crear Asistente",
        },
        toasts: {
          deleted: "Asistente eliminado con éxito.",
          updated: "Asistente actualizado con éxito."
        },
        confirmationModal: {
          deleteTitle: "Eliminar Asistente",
          deleteMessage: "¿Está seguro? Se perderán todos los datos del asistente. Los tickets abiertos se moverán a espera.",
        },
      },
      settings: {
        success: "Configuración guardada con éxito.",
        title: "Configuración",
        settings: {
          userCreation: {
            name: "Creación de asistente",
            note: "Permitir la creación de Agentes",
            options: {
              enabled: "Habilitado",
              disabled: "Deshabilitado",
            },
          },
          allTicket: {
            name: "Todo el mundo puede ver el ticket sin departamento.",
            note: "Active esta función para que todos los usuarios vean los conversaciones sin sector.",
            options: {
              enabled: "Habilitado",
              disabled: "Deshabilitado",
            },
          },
          CheckMsgIsGroup: {
            name: "Ignorar mensajes de grupo",
            note: "Si lo desactivas, recibirás mensajes de grupos.",
            options: {
              enabled: "Habilitado",
              disabled: "Deshabilitado",
            },
          },
          call: {
            name: "Aceptar llamadas",
            note: "Si está deshabilitado, el cliente recibirá un mensaje de que no acepta llamadas de voz/video",
            options: {
              enabled: "Habilitado",
              disabled: "Deshabilitado",
            },
          },
          sideMenu: {
            name: "Menú lateral de inicio",
            note: "Si está habilitado, el menú lateral comenzará cerrado",
            options: {
              enabled: "Abrir",
              disabled: "Cerrado",
            },
          },
          closeTicketApi: {
            name: "Cerrar ticket enviado API",
            note: "Cierra automáticamente el ticket cuando se envía a través de API",
            options: {
              enabled: "Habilitado",
              disabled: "Deshabilitado",
            },
          },
          darkMode: {
            name: "Habilitar modo oscuro",
            note: "Cambiar entre el modo claro y el modo oscuro",
            options: {
              enabled: "Habilitado",
              disabled: "Deshabilitado",
            },
          },
          ASC: {
            name: "Pedido de Entradas",
            note: "Cuando está habilitado, se ordenará de forma ascendente (ASC), al deshabilitarlo se ordenará de forma descendente (DESC)",
            options: {
              enabled: "Habilitado",
              disabled: "Deshabilitado",
            },
          },
          created: {
            name: "Orden de entradas (createdAt or updateAt)",
            note: "Cuando se activa, se ordenará por fecha de creación (createdAt), al desactivar se ordenará por fecha de actualización (updateAt)",
            options: {
              enabled: "Habilitado",
              disabled: "Deshabilitado",
            },
          },
          timeCreateNewTicket: {
            name: "Crear nuevo ticket después",
            note: "Seleccione el tiempo que tardará en abrir un nuevo ticket si el cliente lo contacta nuevamente",
            options: {
              "5": "5 segundos",
              "10": "10 segundos",
              "30": "30 segundos",
              "60": "1 minuto",
              "300": "5 minutos",
              "1800": "30 minutos",
              "3600": "1 hora",
              "7200": "2 horas",
              "21600": "6 horas",
              "43200": "12 horas",
              "86400": "24 horas",
              "604800": "7 días",
              "1296000": "15 días",
              "2592000": "30 días",
            },
          },
          storage: {
            title: "Almacenamiento Externo",
            note: "Gestión de archivos multimedia en storage externo (S3/MinIO)",
            status: "Estado",
            healthy: "Conectado",
            unhealthy: "Desconectado",
            local: "Local",
            pending: "Pendientes",
            syncing: "Sincronizando",
            completed: "Completados",
            failed: "Fallidos",
            syncButton: "Sincronizar Ahora",
            syncSuccess: "Sincronización completada",
            syncError: "Error al sincronizar",
            noExternalStorage: "Storage externo no configurado",
            localFiles: "Archivos Locales",
            localFilesNote: "Archivos multimedia almacenados localmente que pueden migrarse al storage externo",
            scanButton: "Escanear",
            scanSuccess: "Se encontraron {{count}} archivos locales",
            scanError: "Error al escanear archivos",
            migrateButton: "Migrar a S3",
            migrationStarted: "Migración iniciada",
            migrationCompleted: "Migración completada: {{count}} archivos migrados",
            migrationError: "Error al iniciar migración",
            migrating: "Migrando",
            migrated: "migrados",
            skipped: "omitidos",
            lastMigration: "Última migración",
            autoCleanup: "Auto-limpieza activa",
            inS3: "En S3",
            pendingMigration: "Por migrar",
            totalLocal: "archivos locales",
            filesInS3: "Archivos en S3",
          },
        },
      },
      messagesList: {
        header: {
          assignedTo: "Asignado:",
          buttons: {
            return: "Volver",
            resolve: "Resolver",
            reopen: "Reabrir",
            accept: "Aceptar",
            finish: "Finalizar",
            sync: "Sincronizar mensajes",
          },
        },
        edited: "Editado",
      },
      messagesInput: {
        placeholderOpen: "Ingrese un mensaje",
        placeholderClosed: "Reabrir o aceptar este ticket para enviar un mensaje.",
        signMessage: "Suscribirse",
        captionPlaceholder: "Agrega un subtítulo...",
        cancel: "Cancelar",
      },
      contactDrawer: {
        header: "Datos de contacto",
        buttons: {
          edit: "Editar contacto",
        },
        extraInfo: "Otra información",
      },
      copyToClipboard: {
        copy: "Copiar",
        copied: "Copiado"
      },
      ticketOptionsMenu: {
        delete: "Eliminar",
        transfer: "Transferir",
        confirmationModal: {
          title: "Eliminar el ticket ",
          titleFrom: "del contacto ",
          message: "¡Atención! Todos los mensajes relacionados con el ticket se perderán.",
        },
        buttons: {
          delete: "Eliminar",
          cancel: "Cancelar",
        },
      },
      confirmationModal: {
        buttons: {
          confirm: "Está bien",
          cancel: "Cancelar",
        },
      },
      messageOptionsMenu: {
        delete: "Eliminar",
        reply: "Responder",
        forward: "Reenviar",
        edit: "Editar",
        confirmationModal: {
          title: "¿Eliminar mensaje?",
          message: "Esta acción no se puede revertir.",
        },
      },
      editMessageModal: {
        title: "Editar mensaje",
        messageLabel: "Mensaje",
        placeholder: "Escribe el nuevo mensaje...",
        characters: "caracteres",
        timeRemaining: "Tiempo restante para editar",
        timeExpired: "El tiempo para editar este mensaje ha expirado (máximo 15 minutos)",
        success: "Mensaje editado exitosamente",
        cancel: "Cancelar",
        save: "Guardar",
      },
      forwardMessageModal: {
        title: "Reenviar mensaje",
        fieldLabel: "Buscar contacto",
        messagePreview: "Vista previa del mensaje:",
        success: "Mensaje reenviado exitosamente",
        buttons: {
          cancel: "Cancelar",
          forward: "Reenviar",
        },
        mediaTypes: {
          image: "📷 Imagen",
          video: "🎥 Video",
          audio: "🎵 Audio",
          document: "📄 Documento",
        },
      },
      backendErrors: {
        ERR_NO_OTHER_WHATSAPP: "Debe haber al menos un WhatsApp predeterminado.",
        ERR_NO_DEF_WAPP_FOUND: "No se encontró WhatsApp predeterminado. Verifique la página de conexiones.",
        ERR_WAPP_NOT_INITIALIZED: "Esta sesión de WhatsApp no ​​fue inicializada. Por favor revisa la página de conexiones.",
        ERR_WAPP_CHECK_CONTACT: "No se pudo verificar el contacto de WhatsApp. Verifique la página de conexiones.",
        ERR_WAPP_INVALID_CONTACT: "Este no es un número de Whatsapp válido.",
        ERR_WAPP_DOWNLOAD_MEDIA: "No se pueden descargar medios de WhatsApp. Verifique la página de conexiones",
        ERR_INVALID_CREDENTIALS: "Error de autenticación. Vuelva a intentarlo",
        ERR_SENDING_WAPP_MSG: "Error al enviar el mensaje de WhatsApp. Verificar página de conexiones.",
        ERR_DELETE_WAPP_MSG: "No se pudo eliminar el mensaje de WhatsApp.",
        ERR_EDIT_WAPP_MSG: "No se pudo editar el mensaje de WhatsApp.",
        ERR_MESSAGE_NOT_FOUND: "Mensaje no encontrado.",
        ERR_EDIT_ONLY_OWN_MESSAGES: "Solo puedes editar tus propios mensajes.",
        ERR_CANNOT_EDIT_DELETED_MESSAGE: "No se puede editar un mensaje eliminado.",
        ERR_CANNOT_EDIT_MEDIA_MESSAGE: "Solo se pueden editar mensajes de texto.",
        ERR_MESSAGE_EDIT_TIME_EXPIRED: "El tiempo para editar este mensaje ha expirado (máximo 15 minutos).",
        ERR_OTHER_OPEN_TICKET: "Ya hay un ticket abierto para este contacto.",
        ERR_SESSION_EXPIRED: "Sesión caducada. Inicie sesión.",
        ERR_USER_CREATION_DISABLED: "La creación de Agentes ha sido deshabilitada por el administrador.",
        ERR_NO_PERMISSION: "No tienes permiso para acceder a este recurso.",
        ERR_DUPLICATED_CONTACT: "Ya existe un contacto con este número.",
        ERR_NO_SETTING_FOUND: "No se encontraron configuraciones con esta ID.",
        ERR_NO_CONTACT_FOUND: "No se encontró ningún contacto con esta ID.",
        ERR_NO_TICKET_FOUND: "No se encontraron conversaciones con esta ID.",
        ERR_NO_USER_FOUND: "No se encontró ningún asistente con esta ID.",
        ERR_NO_WAPP_FOUND: "No se encontró WhatsApp con este ID.",
        ERR_CREATING_MESSAGE: "Error al crear el mensaje en la base de datos.",
        ERR_CREATING_TICKET: "Error al crear el ticket en la base de datos.",
        ERR_FETCH_WAPP_MSG: "Error al obtener el mensaje en WhatsApp, puede ser demasiado antiguo.",
        ERR_FORWARD_WAPP_MSG: "Error al reenviar el mensaje de WhatsApp.",
        ERR_QUEUE_COLOR_ALREADY_EXISTS: "Este color ya está en uso, elige otro.",
        ERR_WAPP_GREETING_REQUIRED: "El mensaje de saludo es obligatorio cuando hay más de un Sector.",
        ERR_USER_CREATION_COUNT: "Límite de Agentes alcanzado, comuníquese con soporte para cambiar",
        ERR_CONNECTION_CREATION_COUNT: "Límite de conexión alcanzado, comuníquese con soporte para cambiar.",
        ERR_NO_TAG_FOUND: "Etiqueta no encontrada.",
        ERR_OUT_OF_HOURS: "Fora do Horário de Expediente!",
        ERR_NO_INTEGRATION_FOUND: "Integración no encontrada.",
      },
      // Queue Integrations (Typebot)
      queueIntegration: {
        title: "Integraciones Typebot",
        searchPlaceholder: "Buscar...",
        table: {
          id: "ID",
          name: "Nombre",
          actions: "Acciones",
        },
        buttons: {
          add: "Agregar Typebot",
          edit: "Editar",
          delete: "Eliminar",
        },
        toasts: {
          deleted: "Integración eliminada con éxito.",
        },
        confirmationModal: {
          deleteTitle: "Eliminar ",
          deleteMessage: "¿Está seguro de que desea eliminar esta integración? Esta acción no se puede revertir.",
        },
      },
      queueIntegrationModal: {
        title: {
          add: "Agregar Integración Typebot",
          edit: "Editar Integración Typebot",
        },
        success: {
          add: "Integración agregada con éxito.",
          edit: "Integración actualizada con éxito.",
        },
        form: {
          name: "Nombre de la integración",
          typebotSettings: "Configuración de Typebot",
          typebotUrl: "URL del servidor Typebot",
          typebotUrlHelper: "Ej: https://typebot.tuservidor.com",
          typebotSlug: "Slug del Typebot",
          typebotSlugHelper: "Identificador del flujo de Typebot",
          typebotExpires: "Expiración de sesión (minutos)",
          typebotExpiresHelper: "0 = nunca expira",
          typebotDelayMessage: "Delay entre mensajes (ms)",
          typebotDelayMessageHelper: "Tiempo de espera entre mensajes",
          typebotKeywordFinish: "Palabra clave para finalizar",
          typebotKeywordFinishHelper: "Ej: #finalizar",
          typebotKeywordRestart: "Palabra clave para reiniciar",
          typebotKeywordRestartHelper: "Ej: #reiniciar",
          typebotUnknownMessage: "Mensaje de entrada no reconocida",
          typebotUnknownMessageHelper: "Mensaje cuando el bot no entiende",
          typebotRestartMessage: "Mensaje de reinicio",
          typebotRestartMessageHelper: "Mensaje cuando se reinicia la conversación",
        },
        buttons: {
          okAdd: "Agregar",
          okEdit: "Guardar",
          cancel: "Cancelar",
        },
      },
    },
  },
};

export { messages };