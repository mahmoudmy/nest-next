import { createApplication } from './bootstrap';
import { environment } from '@qms/config';
import { ZodError } from 'zod';
function startupFailure(error:unknown):void {
  if(error instanceof ZodError){
    const fields=error.issues.map(issue=>issue.path.join('.')||'environment').join(', ');
    process.stderr.write(`API startup failed: invalid environment variables: ${fields}\n`);
    return;
  }
  if(error instanceof Error){
    // Include the driver code/message, never the connection string or request secrets.
    const safe=error.message.replace(/postgres(?:ql)?:\/\/[^\s]+/gi,'postgresql://[redacted]').replace(/(access|secret|password|token|key)[=:][^\s]+/gi,'$1=[redacted]');
    process.stderr.write(`API startup failed: ${error.name}: ${safe}\n`);
    return;
  }
  process.stderr.write('API startup failed: unknown startup error\n');
}
void createApplication().then(app=>app.listen(environment().PORT,'0.0.0.0')).catch(error=>{startupFailure(error);process.exitCode=1;});
