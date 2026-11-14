import {spawn} from 'node:child_process';
const api=spawn(process.execPath,['--env-file-if-exists=.env.local','--import','tsx','server/node.ts'],{stdio:'inherit'});
const app=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','0.0.0.0','--port',process.env.PORT||'3000'],{stdio:'inherit'});
const cleanup=()=>{api.kill();app.kill();};process.on('SIGTERM',cleanup);process.on('SIGINT',cleanup);app.on('exit',code=>{api.kill();process.exit(code||0);});api.on('exit',code=>{if(code){app.kill();process.exit(code);}});
