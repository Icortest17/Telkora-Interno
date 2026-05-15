import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = 'Telkora Interno <noreply@telkora.com>'

// Shared inline styles
const base = `font-family:Arial,sans-serif;color:#111;background:#fff;padding:32px;max-width:600px;margin:0 auto;`
const accent = `#00CC6A`
const badge = `display:inline-block;background:${accent};color:#fff;padding:2px 10px;border-radius:4px;font-size:13px;`

export interface FollowupLead {
  empresa: string
  estado: string
  dias: number
}

export async function sendFollowupUrgente(
  to: string,
  nombre: string,
  leads: FollowupLead[]
): Promise<void> {
  const filas = leads
    .map(
      (l) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${l.empresa}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${l.estado.replace(/_/g, ' ')}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;color:${accent};font-weight:bold;">
            ${l.dias === 0 ? 'Hoy' : `Hace ${l.dias} día${l.dias !== 1 ? 's' : ''}`}
          </td>
        </tr>`
    )
    .join('')

  const html = `
<div style="${base}">
  <h2 style="color:${accent};margin-top:0;">Follow-ups vencidos</h2>
  <p>Hola <strong>${nombre}</strong>,</p>
  <p>Tienes <strong>${leads.length}</strong> lead${leads.length !== 1 ? 's' : ''} con follow-up vencido que necesitan atención:</p>
  <table style="width:100%;border-collapse:collapse;margin:20px 0;">
    <thead>
      <tr style="background:#f5f5f5;">
        <th style="padding:8px 12px;text-align:left;font-size:13px;">Empresa</th>
        <th style="padding:8px 12px;text-align:left;font-size:13px;">Estado</th>
        <th style="padding:8px 12px;text-align:left;font-size:13px;">Vencimiento</th>
      </tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>
  <p style="font-size:13px;color:#666;">Entra en Telkora Interno para actualizar el seguimiento.</p>
</div>`

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `[Telkora] ${leads.length} follow-up${leads.length !== 1 ? 's' : ''} vencido${leads.length !== 1 ? 's' : ''}`,
      html,
    })
  } catch (err) {
    console.error('[email] sendFollowupUrgente error:', err)
  }
}

export async function sendLeadCerradoGanado(
  to: string,
  nombre: string,
  empresa: string,
  valor: number
): Promise<void> {
  const valorFormateado = valor.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  })

  const html = `
<div style="${base}">
  <h2 style="color:${accent};margin-top:0;">Lead cerrado ganado</h2>
  <p>Hola <strong>${nombre}</strong>,</p>
  <p>Enhorabuena, has cerrado un nuevo cliente:</p>
  <div style="background:#f9fafb;border-left:4px solid ${accent};padding:16px 20px;margin:20px 0;border-radius:0 8px 8px 0;">
    <p style="margin:0 0 8px;font-size:18px;font-weight:bold;">${empresa}</p>
    <p style="margin:0;">Valor estimado: <span style="${badge}">${valorFormateado}</span></p>
  </div>
  <p style="font-size:13px;color:#666;">Sigue así, el equipo Telkora lo está haciendo genial.</p>
</div>`

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `[Telkora] Nuevo cliente ganado: ${empresa}`,
      html,
    })
  } catch (err) {
    console.error('[email] sendLeadCerradoGanado error:', err)
  }
}

export async function sendTransaccionVencida(
  to: string,
  nombre: string,
  concepto: string,
  importe: number
): Promise<void> {
  const importeFormateado = importe.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  })

  const html = `
<div style="${base}">
  <h2 style="color:#e53e3e;margin-top:0;">Transaccion vencida</h2>
  <p>Hola <strong>${nombre}</strong>,</p>
  <p>Tienes una transaccion pendiente de cobro que ha vencido:</p>
  <div style="background:#fff5f5;border-left:4px solid #e53e3e;padding:16px 20px;margin:20px 0;border-radius:0 8px 8px 0;">
    <p style="margin:0 0 8px;font-size:16px;font-weight:bold;">${concepto}</p>
    <p style="margin:0;">Importe: <strong>${importeFormateado}</strong></p>
  </div>
  <p style="font-size:13px;color:#666;">Entra en Telkora Interno para gestionar el cobro.</p>
</div>`

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `[Telkora] Transaccion vencida: ${concepto}`,
      html,
    })
  } catch (err) {
    console.error('[email] sendTransaccionVencida error:', err)
  }
}
