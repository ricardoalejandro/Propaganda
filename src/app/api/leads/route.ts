import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { leadLogger } from '@/lib/logger'

// GET /api/leads - Listar leads
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    const searchParams = request.nextUrl.searchParams
    const funnelId = searchParams.get('funnelId')
    const stageId = searchParams.get('stageId')
    const search = searchParams.get('search')

    await leadLogger.debug('leads_list_start', `Iniciando listado de leads`, {
      funnelId,
      stageId,
      search,
      requestId,
    }, { requestId })

    const where: Record<string, unknown> = {}

    if (funnelId) {
      where.funnelId = funnelId
    }

    if (stageId) {
      where.stageId = stageId
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
      ]
    }

    await leadLogger.debug('leads_list_query', `Ejecutando consulta de leads`, {
      where: JSON.stringify(where),
    }, { requestId })

    const leads = await prisma.lead.findMany({
      where,
      include: {
        stage: true,
        funnel: true,
        sourceAccount: {
          select: { phoneNumber: true, filial: true },
        },
        _count: {
          select: { notes: true, conversations: true },
        },
      },
      orderBy: [{ stageId: 'asc' }, { position: 'asc' }],
    })

    await leadLogger.info('leads_list_success', `Leads obtenidos`, {
      count: leads.length,
      funnelId,
      stageId,
    }, { requestId })

    return NextResponse.json({ leads })
  } catch (error) {
    await leadLogger.error('leads_list_error', `Error al listar leads`, error as Error, { requestId }, { requestId })
    return NextResponse.json(
      { error: 'Error al obtener los leads' },
      { status: 500 }
    )
  }
}

// POST /api/leads - Crear lead manualmente
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  try {
    const body = await request.json()
    const { phoneNumber, name, funnelId, stageId, value, sourceAccountId } = body

    await leadLogger.info('lead_create_start', `Iniciando creación de lead`, {
      phoneNumber,
      name,
      funnelId,
      stageId,
      value,
      sourceAccountId,
      requestId,
    }, { requestId })

    // Validar campos requeridos
    if (!phoneNumber) {
      await leadLogger.warn('lead_create_validation', `phoneNumber es requerido`, { requestId }, { requestId })
      return NextResponse.json(
        { error: 'El número de teléfono es requerido' },
        { status: 400 }
      )
    }

    if (!funnelId) {
      await leadLogger.warn('lead_create_validation', `funnelId es requerido`, { requestId }, { requestId })
      return NextResponse.json(
        { error: 'El embudo es requerido' },
        { status: 400 }
      )
    }

    if (!stageId) {
      await leadLogger.warn('lead_create_validation', `stageId es requerido`, { requestId }, { requestId })
      return NextResponse.json(
        { error: 'La etapa es requerida' },
        { status: 400 }
      )
    }

    // Si no se proporciona sourceAccountId, usar la primera cuenta conectada
    let finalSourceAccountId = sourceAccountId
    if (!finalSourceAccountId) {
      const defaultAccount = await prisma.whatsAppAccount.findFirst({
        where: { status: 'CONNECTED' },
        orderBy: { createdAt: 'asc' },
      })
      if (!defaultAccount) {
        await leadLogger.warn('lead_create_validation', `No hay cuentas de WhatsApp conectadas`, { requestId }, { requestId })
        return NextResponse.json(
          { error: 'No hay cuentas de WhatsApp conectadas. Conecta una cuenta primero.' },
          { status: 400 }
        )
      }
      finalSourceAccountId = defaultAccount.id
      await leadLogger.info('lead_create_auto_account', `Usando cuenta por defecto`, {
        accountId: finalSourceAccountId,
        deviceId: defaultAccount.deviceId,
      }, { requestId })
    }

    // Validar que existe el embudo
    await leadLogger.debug('lead_create_funnel_check', `Verificando embudo`, { funnelId }, { requestId })
    const funnel = await prisma.funnel.findUnique({
      where: { id: funnelId },
    })

    if (!funnel) {
      await leadLogger.warn('lead_create_funnel_not_found', `Embudo no encontrado`, { funnelId }, { requestId })
      return NextResponse.json(
        { error: 'Embudo no encontrado' },
        { status: 400 }
      )
    }

    // Validar que existe la etapa
    await leadLogger.debug('lead_create_stage_check', `Verificando etapa`, { stageId, funnelId }, { requestId })
    const stage = await prisma.funnelStage.findUnique({
      where: { id: stageId },
    })

    if (!stage) {
      await leadLogger.warn('lead_create_stage_not_found', `Etapa no encontrada`, { stageId }, { requestId })
      return NextResponse.json(
        { error: 'Etapa no encontrada' },
        { status: 400 }
      )
    }

    if (stage.funnelId !== funnelId) {
      await leadLogger.warn('lead_create_stage_mismatch', `Etapa no pertenece al embudo`, {
        stageId,
        stageFunnelId: stage.funnelId,
        requestedFunnelId: funnelId,
      }, { requestId })
      return NextResponse.json(
        { error: 'La etapa no pertenece al embudo seleccionado' },
        { status: 400 }
      )
    }

    // Validar que existe la cuenta de origen
    await leadLogger.debug('lead_create_account_check', `Verificando cuenta de origen`, { sourceAccountId: finalSourceAccountId }, { requestId })
    const account = await prisma.whatsAppAccount.findUnique({
      where: { id: finalSourceAccountId },
    })

    if (!account) {
      await leadLogger.warn('lead_create_account_not_found', `Cuenta de origen no encontrada`, { sourceAccountId }, { requestId })
      return NextResponse.json(
        { error: 'Cuenta de WhatsApp no encontrada' },
        { status: 400 }
      )
    }

    // Verificar si ya existe un lead con el mismo número en este embudo
    await leadLogger.debug('lead_create_duplicate_check', `Verificando duplicado`, {
      phoneNumber,
      funnelId,
    }, { requestId })
    
    const existingLead = await prisma.lead.findFirst({
      where: {
        phoneNumber,
        funnelId,
      },
    })

    if (existingLead) {
      await leadLogger.warn('lead_create_duplicate', `Lead duplicado`, {
        phoneNumber,
        funnelId,
        existingLeadId: existingLead.id,
      }, { requestId })
      return NextResponse.json(
        { error: 'Ya existe un lead con este número en este embudo' },
        { status: 400 }
      )
    }

    // Obtener última posición en la etapa
    await leadLogger.debug('lead_create_position', `Calculando posición`, { stageId }, { requestId })
    const lastLead = await prisma.lead.findFirst({
      where: { stageId },
      orderBy: { position: 'desc' },
    })
    const position = (lastLead?.position || 0) + 1

    await leadLogger.info('lead_create_db', `Creando lead en base de datos`, {
      phoneNumber,
      name,
      funnelId,
      stageId,
      position,
      value,
      sourceAccountId: finalSourceAccountId,
    }, { requestId })

    const lead = await prisma.lead.create({
      data: {
        phoneNumber,
        name,
        funnelId,
        stageId,
        position,
        value,
        sourceAccountId: finalSourceAccountId,
      },
      include: {
        stage: true,
        funnel: true,
        sourceAccount: {
          select: { phoneNumber: true, filial: true },
        },
      },
    })

    await leadLogger.info('lead_create_success', `Lead creado exitosamente`, {
      leadId: lead.id,
      phoneNumber: lead.phoneNumber,
      name: lead.name,
      funnelId: lead.funnelId,
      stageId: lead.stageId,
    }, { leadId: lead.id, requestId })

    return NextResponse.json({ lead }, { status: 201 })
  } catch (error) {
    await leadLogger.error('lead_create_fatal', `Error fatal al crear lead`, error as Error, { requestId }, { requestId })
    return NextResponse.json(
      { error: 'Error al crear el lead', details: (error as Error).message },
      { status: 500 }
    )
  }
}

