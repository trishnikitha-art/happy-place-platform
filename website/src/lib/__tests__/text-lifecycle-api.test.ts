jest.mock('@/lib/workbench-session',()=>({workbenchSession:{isAuthenticated:jest.fn()}}));
jest.mock('@/lib/text-recovery',()=>({changeTextLifecycle:jest.fn()}));
import { workbenchSession } from '../workbench-session';
import { changeTextLifecycle } from '../text-recovery';
import { TextError } from '../text-errors';
import { POST } from '@/app/api/workbench/text/lifecycle/route';
const id='WBDEP-1791550000000-12345678-1234-1234-1234-123456789abc';
const request=(body=JSON.stringify({transactionId:id,action:'cancel'}))=>new Request('https://site/api/workbench/text/lifecycle',{method:'POST',body});
beforeEach(()=>{jest.clearAllMocks();jest.mocked(workbenchSession.isAuthenticated).mockResolvedValue(true);});
it('does not touch lifecycle data without a server session',async()=> {
  jest.mocked(workbenchSession.isAuthenticated).mockResolvedValue(false);
  expect((await POST(request())).status).toBe(401);
  expect(changeTextLifecycle).not.toHaveBeenCalled();
});
it.each(['{',JSON.stringify({transactionId:'invalid',action:'cancel'}),JSON.stringify({transactionId:id,action:'deleteEverything'})])('rejects invalid requests before lifecycle mutation',async body=> {
  const response=await POST(request(body));
  expect(response.status).toBe(400);expect((await response.json()).correlationId).toEqual(expect.any(String));
  expect(changeTextLifecycle).not.toHaveBeenCalled();
});
it.each([403,404,409])('preserves the lifecycle authority status %i and diagnostic receipt',async status=> {
  jest.mocked(changeTextLifecycle).mockRejectedValue(new TextError(status,'LIFECYCLE_REJECTED'));
  const response=await POST(request());const body=await response.json();
  expect(response.status).toBe(status);expect(body).toMatchObject({transactionId:id,code:'LIFECYCLE_REJECTED',correlationId:expect.any(String)});
});
it('classifies dependency errors without disclosing the underlying secret',async()=> {
  jest.mocked(changeTextLifecycle).mockRejectedValue(new Error('https://private.example/?token=secret'));
  const response=await POST(request());const body=await response.json();
  expect(response.status).toBe(503);expect(body.transactionId).toBe(id);
  expect(JSON.stringify(body)).not.toContain('secret');
});
it('classifies unexpected session failures as server errors',async()=> {
  jest.mocked(workbenchSession.isAuthenticated).mockRejectedValue(new Error('unexpected'));
  const response=await POST(request());expect(response.status).toBe(500);
});
