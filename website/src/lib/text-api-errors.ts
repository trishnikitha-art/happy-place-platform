import { NextResponse } from 'next/server';
import { TextError } from './text-errors';
export function textFailure(error: unknown, correlationId: string, transactionId?: string) {
  const e=error instanceof TextError ? error : new TextError(500,'TEXT_INTERNAL_ERROR');
  console.error('[TEXT_API]',{code:e.code,correlationId,transactionId});
  return NextResponse.json({error:e.message,code:e.code,correlationId,transactionId},{status:e.status,headers:{'Cache-Control':'no-store'}});
}
