import 'server-only';
import { z } from 'zod';
import { adminClient } from '@/lib/supabase/admin';
import { checkoutSchema, paymongo, paymentMode } from '@/lib/paymongo';
export async function verifyCheckout(checkoutId:string,eventId?:string) {
 if(!/^cs_[A-Za-z0-9]+$/.test(checkoutId))throw new Error('Invalid checkout');
 const live=paymentMode(),admin=adminClient();
 const session=checkoutSchema.parse(await paymongo('/v1/checkout_sessions/'+checkoutId)).data;
 if(session.id!==checkoutId||session.attributes.livemode!==live)throw new Error('Payment mismatch');
 const payment=session.attributes.payments?.find(p=>p.attributes.status==='paid');
 if(!payment)return;
 const order=z.string().uuid().parse(session.attributes.reference_number);
 if(payment.attributes.livemode!==live||payment.attributes.currency!=='PHP')throw new Error('Payment mismatch');
 const {error}=await admin.rpc('credit_payment',{p_event_id:eventId||'reconcile:'+payment.id,p_order_id:order,p_checkout_id:session.id,p_payment_id:payment.id,p_amount:payment.attributes.amount,p_currency:payment.attributes.currency,p_live:live});
 if(error)throw new Error('Unable to fulfill payment');
 if(payment.attributes.disputed||payment.attributes.refunded||payment.attributes.refunds?.length){const {error:review}=await admin.rpc('record_billing_review',{p_event_id:'review:'+payment.id,p_payment_id:payment.id,p_type:'payment.requires_review'});if(review)throw new Error('Unable to record review');}
}
export async function reconcilePayments(started:number) {
 const {data,error}=await adminClient().rpc('pending_checkouts',{p_live:paymentMode()});
 if(error)throw new Error('Unable to reconcile payments');
 const rows=z.array(z.object({provider_checkout_id:z.string()})).parse(data);
 for(const row of rows){if(Date.now()-started>15000)break;try{await verifyCheckout(row.provider_checkout_id);}catch{console.warn('payment_reconciliation_pending');}}
}

export async function verifyRefund(refundId:string) {
 if(!/^ref_[A-Za-z0-9]+$/.test(refundId))return;
 const result=z.object({data:z.object({id:z.string(),attributes:z.object({status:z.string(),payment_id:z.string().regex(/^pay_[A-Za-z0-9]+$/),amount:z.number().int().positive(),currency:z.string(),livemode:z.boolean()})})}).parse(await paymongo('/v1/refunds/'+refundId)).data;
 const r=result.attributes;if(result.id!==refundId||r.livemode!==paymentMode())throw new Error('Refund mismatch');
 if(r.status!=='succeeded')return;
 const {error}=await adminClient().rpc('apply_verified_refund',{p_payment:r.payment_id,p_amount:r.amount,p_currency:r.currency,p_live:r.livemode});
 if(error)throw new Error('Refund adjustment failed');
}
