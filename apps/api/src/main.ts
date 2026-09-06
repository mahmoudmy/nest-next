import { createApplication } from './bootstrap';
import { environment } from '@qms/config';
void createApplication().then(app=>app.listen(environment().PORT,'0.0.0.0')).catch(()=>{process.stderr.write('API startup failed. Verify environment, migrations, and database connectivity.\n');process.exitCode=1;});
