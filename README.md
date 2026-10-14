# StreamPulse — Dashboard de Twitch

StreamPulse es un proyecto educativo de portfolio para consultar categorías populares y directos en vivo mediante la API oficial de Twitch Helix. La interfaz utiliza React, Vite, Tailwind CSS y Recharts.

> **Estado del proyecto:** primera fase de reparación. El arranque, la autenticación del navegador y la presentación de métricas se han ordenado, pero la aplicación debe probarse con un Client ID válido y con las URLs de retorno configuradas en Twitch antes de considerarla lista para publicar.

## Funcionalidades actuales

- Consulta del Top global de categorías y de una muestra de hasta 100 directos por idioma seleccionado.
- Búsqueda local por nombre de canal, título o categoría.
- Selector GLOBAL / ES / EN / JA / FR / DE / IT / PT para consultar muestras de directos por idioma.
- Ranking de juegos calculado a partir de los espectadores observados en la muestra del idioma elegido.
- Ranking de directos ordenado por espectadores actuales (no por seguidores).
- Actualización automática aproximada cada 60 segundos, evitando peticiones simultáneas.
- Estados visibles de carga, error y conexión pendiente.

### Límites de las estadísticas

La API devuelve una muestra limitada de directos (hasta 100 por consulta; en los filtros de idioma, la muestra se solicita a Twitch para ese idioma). La suma de espectadores presentada aquí solo describe los directos consultados; **no representa la audiencia total de Twitch**. El endpoint público del Top de categorías no proporciona el total de espectadores por categoría en la respuesta usada por esta versión, por lo que el gráfico calcula la suma observada en la muestra. No se generan cifras aleatorias para rellenar datos ausentes.

## Requisitos

- Node.js LTS reciente y npm.
- Una aplicación registrada en [Twitch Developer Console](https://dev.twitch.tv/console/apps).
- El Client ID de esa aplicación. No pongas el Client Secret en el frontend ni en variables `VITE_*`.

## Ejecución local

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Copia `.env.example` a `.env` y sustituye el valor de ejemplo:

   ```env
   VITE_TWITCH_CLIENT_ID=tu_client_id_de_twitch
   ```

3. En la configuración de la aplicación de Twitch, registra exactamente esta URL de retorno para desarrollo:

   ```text
   http://localhost:5173/
   ```

4. Arranca Vite:

   ```bash
   npm run dev
   ```

5. Abre `http://localhost:5173/` y pulsa **Conectar con Twitch**.

Para producción, registra también la URL de retorno exacta del dominio publicado y vuelve a desplegar tras configurar la variable de entorno correspondiente.

## Scripts

- `npm run dev`: servidor de desarrollo.
- `npm run build`: compilación de producción.
- `npm run preview`: vista previa local de la compilación.

## Notas de autenticación

Esta primera versión utiliza el flujo OAuth implícito de Twitch para mantener el alcance del MVP acotado. El token de usuario se guarda en `localStorage`, no tiene refresh token en este flujo y puede requerir que el usuario vuelva a autorizar la aplicación cuando caduque. El código valida el parámetro `state` y gestiona los errores HTTP más comunes, pero **antes de un despliegue público conviene evaluar el flujo de autorización con PKCE o un backend/serverless**, según los requisitos finales.

El Client ID es identificador público de la aplicación, no una contraseña. No publiques tokens, credenciales ni archivos `.env`.

## Próximas comprobaciones

- Instalar dependencias en un entorno con acceso al registro npm y ejecutar `npm run build`.
- Probar la autorización con el Client ID real y la URL de retorno exacta.
- Validar los estados de error, caducidad del token y límite de peticiones.
- Comprobar la interfaz en móvil y escritorio.
- Revisar accesibilidad, textos y documentación antes de presentar el proyecto como terminado.


## El mentidero gamer (Google Alerts RSS/Atom)

La sección **El mentidero gamer** lee hasta cinco feeds Atom de Google Alerts desde una función de servidor (`/api/rumors`). Las URL de los feeds se configuran como variables de entorno para no exponerlas en el código.

### Desarrollo local

1. Copia `.env.example` a `.env`.
2. Pega las cinco URL de Feed RSS de Google Alerts en `GOOGLE_ALERTS_RSS_1` … `GOOGLE_ALERTS_RSS_5`. Conserva también tu valor real de `RAWG_API_KEY` en `.env` si ya lo utilizabas.
3. En una terminal, arranca la API local: `npm run dev:api`.
4. En otra terminal, arranca Vite: `npm run dev`.
5. Abre la aplicación y selecciona **El mentidero gamer** en el menú lateral.

La API local escucha en `127.0.0.1:3001`; Vite reenvía `/api/*` a esa API. Para producción, configura las cinco variables `GOOGLE_ALERTS_RSS_1` … `GOOGLE_ALERTS_RSS_5` en **Vercel → Project Settings → Environment Variables** y vuelve a desplegar.

La sección deduplica entradas por URL, ofrece búsqueda y filtro por tipo, y muestra el enlace a la fuente en una pestaña nueva. La clasificación automática es orientativa: no verifica la veracidad de un rumor ni convierte una noticia en confirmación oficial. La API conserva resultados en caché durante 15 minutos y permite que los feeds que sí respondan sigan funcionando si alguno falla.

**Privacidad:** no publiques el archivo `.env`, las URL privadas de Google Alerts, credenciales ni la carpeta `.vercel`. El archivo `.env.example` solo contiene nombres de variables vacíos.
