import React from 'react';

const Section = ({ number, title, children }) => (
  <section className="scroll-mt-6 border-b border-zinc-800/80 py-6 last:border-b-0">
    <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">
      <span className="mr-2 text-twitch">{number}.</span>{title}
    </h2>
    <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-300 sm:text-base">
      {children}
    </div>
  </section>
);

export default function PrivacyPolicy() {
  return (
    <article className="mx-auto w-full max-w-4xl flex-1">
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-darkCard shadow-xl">
        <header className="border-b border-zinc-800 bg-gradient-to-br from-violet-950/50 via-darkCard to-darkCard p-6 sm:p-9">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200">
            <span aria-hidden="true">🔒</span> Transparencia y privacidad
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Política de privacidad de <span className="text-violet-400">StreamPulse</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
            Información sobre los datos que pueden tratarse al utilizar StreamPulse y al participar en la iniciativa Streamer de la semana.
          </p>
          <p className="mt-4 text-xs text-zinc-500">Última actualización: 20 de octubre de 2026</p>
        </header>

        <div className="px-6 sm:px-9">
          <Section number="1" title="Responsable">
            <p><strong className="text-zinc-100">Responsable:</strong> Luis Miguel Galacho Cherino</p>
            <p><strong className="text-zinc-100">Contacto:</strong>{' '}<a className="text-violet-300 underline decoration-violet-500/50 underline-offset-4 hover:text-violet-200" href="mailto:streampulse.contacto@proton.me">streampulse.contacto@proton.me</a></p>
            <p><strong className="text-zinc-100">Web:</strong>{' '}<a className="text-violet-300 underline decoration-violet-500/50 underline-offset-4 hover:text-violet-200" href="https://streampulsedashboard.vercel.app" target="_blank" rel="noopener noreferrer">https://streampulsedashboard.vercel.app</a></p>
            <p>StreamPulse es un proyecto independiente de descubrimiento de videojuegos y streamers. No está afiliado ni patrocinado por Twitch.</p>
          </Section>

          <Section number="2" title="¿Qué datos recogemos?">
            <p>StreamPulse puede tratar los siguientes datos:</p>
            <ul className="list-disc space-y-2 pl-6 marker:text-violet-400">
              <li><strong className="text-zinc-100">Recomendaciones:</strong> enlace público al canal de Twitch y motivo de la recomendación, que se envían por correo para su valoración. No se guardan en una base de datos de nominaciones.</li>
              <li><strong className="text-zinc-100">Ficha pública:</strong> presentación, avatar, logotipo o imágenes aprobadas por la persona participante.</li>
              <li><strong className="text-zinc-100">Autorización:</strong> datos identificativos necesarios, documento firmado y aprobación de la ficha.</li>
              <li><strong className="text-zinc-100">Contacto:</strong> mensajes y correo electrónico relacionados con la iniciativa.</li>
              <li><strong className="text-zinc-100">Datos técnicos:</strong> información generada al visitar la web, según la configuración de los servicios utilizados.</li>
              <li><strong className="text-zinc-100">Datos de votación:</strong> identificador del navegador y fecha del voto, para limitar la participación a una vez cada 24 horas por encuesta.</li>
            </ul>
            <p>No solicitamos habitualmente DNI, domicilio ni teléfono para participar.</p>
          </Section>

          <Section number="3" title="¿Para qué utilizamos los datos?">
            <p>Utilizamos los datos para:</p>
            <ul className="list-disc space-y-2 pl-6 marker:text-violet-400">
              <li>Recibir y valorar recomendaciones de canales, y contactar con las personas participantes cuando sea necesario.</li>
              <li>Preparar y revisar las fichas antes de publicarlas.</li>
              <li>Registrar las autorizaciones correspondientes.</li>
              <li>Atender consultas y solicitudes relacionadas con los datos.</li>
              <li>Proteger la web y prevenir usos indebidos.</li>
            </ul>
            <p>No vendemos datos personales ni los utilizamos para publicidad ajena al proyecto.</p>
          </Section>

          <Section number="4" title="¿Qué información publicamos?">
            <p>Publicamos únicamente la información aprobada por la persona participante: alias, enlace a Twitch, presentación e imágenes autorizadas.</p>
            <p>Antes de publicar, enviaremos la ficha para su aprobación. No publicaremos datos de contacto privados, autorizaciones firmadas ni comunicaciones personales.</p>
          </Section>

          <Section number="5" title="Base jurídica">
            <p>Tratamos los datos conforme a la base jurídica aplicable a cada finalidad. Para publicar la ficha y utilizar imágenes u otros materiales, solicitaremos el consentimiento cuando corresponda.</p>
            <p>Puedes retirar tu consentimiento en cualquier momento. La retirada no afecta a los tratamientos realizados legalmente con anterioridad.</p>
          </Section>

          <Section number="6" title="Dónde se almacenan los datos">
            <ul className="list-disc space-y-2 pl-6 marker:text-violet-400">
              <li>
                <strong className="text-zinc-100">Vercel:</strong>{' '}
                alojamiento de la web y ejecución de las funciones de servidor.
              </li>
              <li>
                <strong className="text-zinc-100">Supabase:</strong>{' '}
                almacenamiento y gestión de las votaciones de la comunidad. Las
                recomendaciones de «Streamer de la semana» no se almacenan en Supabase.
              </li>
              <li>
                <strong className="text-zinc-100">Google Apps Script y servicios de Google:</strong>{' '}
                procesamiento de las recomendaciones y gestión del envío de avisos
                por correo electrónico. El script conserva únicamente un contador diario
                agregado para aplicar el límite de envíos, no el contenido de las propuestas.
              </li>
              <li>
                <strong className="text-zinc-100">Proton Mail:</strong>{' '}
                correo de contacto y recepción de los avisos de nominación.
              </li>
              <li>
                <strong className="text-zinc-100">GitHub:</strong>{' '}
                almacenamiento y gestión del código fuente del proyecto.
              </li>
              <li>
                <strong className="text-zinc-100">Equipo local:</strong>{' '}
                conservación de las autorizaciones y fichas que sean necesarias para
                la iniciativa. No se crea un registro local de cada recomendación recibida.
              </li>
            </ul>
            <p>
              Los proveedores pueden tratar datos personales y datos técnicos
              en la medida necesaria para prestar sus servicios. El tratamiento,
              la ubicación y los plazos de conservación dependen de la configuración
              de cada servicio y de las condiciones aplicables.
            </p>
          </Section>

          <Section number="7" title="Transferencias internacionales">
            <p>Algunos proveedores podrían tratar datos fuera del Espacio Económico Europeo. Cuando corresponda, se aplicarán las garantías exigidas por la normativa vigente.</p>
          </Section>

          <Section number="8" title="Conservación de los datos">
            <ul className="list-disc space-y-2 pl-6 marker:text-violet-400">
              <li><strong className="text-zinc-100">Recomendaciones:</strong> StreamPulse no crea una ficha ni un registro de nominación en una base de datos. El canal y el motivo se reciben por correo para su valoración y pueden permanecer en el buzón según su gestión y las opciones de conservación del proveedor de correo.</li>
              <li><strong className="text-zinc-100">Autorizaciones firmadas:</strong> las conservaremos mientras sean necesarias para acreditar los permisos o atender posibles responsabilidades legales.</li>
              <li><strong className="text-zinc-100">Ficha pública:</strong> podrá permanecer en el archivo histórico hasta 365 días desde su publicación, mientras la autorización siga vigente.</li>
              <li><strong className="text-zinc-100">Datos técnicos:</strong> se conservarán según su finalidad y la configuración de los proveedores.</li>
            </ul>
            <p>Si retiras tu consentimiento, retiraremos la ficha de los espacios públicos que controlemos cuando corresponda. No podemos garantizar la eliminación inmediata de copias de terceros o resultados de buscadores.</p>
          </Section>

          <Section number="9" title="Seguridad">
            <p>Aplicamos medidas razonables para proteger los datos, limitar el acceso a los documentos privados y separar la información pública de la confidencial.</p>
            <p>Ningún sistema garantiza una seguridad absoluta.</p>
          </Section>

          <Section number="10" title="Tus derechos">
            <p>Puedes solicitar el acceso, la rectificación o la supresión de tus datos, así como ejercer otros derechos reconocidos por la normativa, escribiendo a{' '}<a className="break-words text-violet-300 underline decoration-violet-500/50 underline-offset-4 hover:text-violet-200" href="mailto:streampulse.contacto@proton.me"><strong>streampulse.contacto@proton.me</strong></a>.</p>
            <p>También puedes retirar tu consentimiento cuando corresponda o presentar una reclamación ante la{' '}<a className="text-violet-300 underline decoration-violet-500/50 underline-offset-4 hover:text-violet-200" href="https://www.aepd.es/" target="_blank" rel="noopener noreferrer">Agencia Española de Protección de Datos</a>.</p>
          </Section>

          <Section number="11" title="Participación de menores">
            <p>Si la participación requiere autorización de una persona representante legal por razón de la edad o de la normativa aplicable, no publicaremos la ficha hasta obtenerla.</p>
          </Section>

          <Section number="12" title="Cambios en esta política">
            <p>Actualizaremos esta política si cambian el proyecto, los servicios utilizados o las obligaciones legales. La versión vigente estará disponible en la web con su fecha de actualización.</p>
          </Section>
        </div>

        <div className="border-t border-zinc-800 bg-zinc-950/40 px-6 py-5 text-xs leading-5 text-zinc-500 sm:px-9">
          StreamPulse es un proyecto independiente. Para consultas sobre privacidad, utiliza el correo de contacto indicado en esta política.
        </div>
      </div>
    </article>
  );
}
