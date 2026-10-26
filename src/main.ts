import {Component, signal} from '@angular/core';
import {bootstrapApplication} from '@angular/platform-browser';
import {FormsModule} from '@angular/forms';
import {DynamicRenderer} from './renderer';
import {Reply, UiAction, validTree} from './schema';

@Component({selector:'employee-app',standalone:true,imports:[FormsModule,DynamicRenderer],template:`
  <main><header><span class="eyebrow">PEOPLE OPERATIONS</span><h1>Employee Assistant</h1><p>Manage employees, review promotion policies, and explore your team.</p></header>
  <section><button (click)="newConversation()">New conversation</button></section>
  <section aria-live="polite">@for(item of history(); track $index){<article [class.user]="item.role==='user'"><span class="eyebrow">{{item.role}}</span><p>{{item.message}}</p>@if(item.reply){<small>{{item.reply.agents.join(' → ')}}</small><employee-dynamic-ui [node]="item.reply.ui" (action)="act($event)"/>}</article>}</section>
  @if(busy()){<p role="status">{{progress()}}</p>}
  @if(error()){<p role="alert" class="error">{{error()}}</p>}
  <form class="composer" (ngSubmit)="send()"><label for="message">Ask about your employees</label><div class="row"><input id="message" [(ngModel)]="message" name="message" maxlength="4000" required placeholder="Show all employees"><button [disabled]="busy() || !message.trim()">Send</button></div></form>
  </main>`})
export class App {
  message=''; conversationId=crypto.randomUUID();
  history=signal<{role:string;message:string;reply?:Reply}[]>([]); busy=signal(false); error=signal('');
  progress=signal('Planning employee workflow…');
  newConversation(){if(this.busy())return;this.conversationId=crypto.randomUUID();this.history.set([]);this.error.set('');}
  async call(path:string, body:unknown){
    if(this.busy()) return;
    this.busy.set(true);this.error.set('');this.progress.set('Planning employee workflow…');
    try {
      const response=await fetch('/api/ai/'+path,{method:'POST',headers:{'Content-Type':'application/json',Accept:path==='chat'?'text/event-stream':'application/json'},body:JSON.stringify(body)});
      if(!response.ok) {const result=await response.json().catch(()=>({}));throw new Error(result.message || 'The request failed. Check your inputs.');}
      let reply:Reply;
      if(path==='chat') {
        if(!response.body)throw new Error('Streaming response unavailable.');
        const reader=response.body.getReader();const decoder=new TextDecoder();let buffer='';let result:Reply|undefined;
        while(true){const chunk=await reader.read();if(chunk.done)break;buffer+=decoder.decode(chunk.value,{stream:true}).replace(/\r\n/g,'\n');
          if(buffer.length>300000)throw new Error('Stream size limit exceeded.');
          let end:number;
          while((end=buffer.indexOf('\n\n'))>=0){const frame=buffer.slice(0,end);buffer=buffer.slice(end+2);const event=frame.split('\n').find(l=>l.startsWith('event:'))?.slice(6).trim();const raw=frame.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5)).join('\n');if(!raw)continue;const data=JSON.parse(raw);
            if(event==='agent_started')this.progress.set('Running '+data.agent+'…');
            if(event==='agent_completed')this.progress.set(data.agent+' completed');
            if(event==='workflow_failed')throw new Error(data.message);
            if(event==='ui_ready')result=data;
          }
        }
        if(!result)throw new Error('Stream ended before a result was received.');reply=result;
      } else reply=await response.json();
      if(reply.schemaVersion!==1 || JSON.stringify(reply).length>250000 || !validTree(reply.ui)) throw new Error('Unsupported UI response.');
      this.history.update(h=>[...h,{role:'assistant',message:reply.message,reply}]);
    }catch(e){this.error.set(e instanceof Error?e.message:'Request failed');}finally{this.busy.set(false);}
  }
  send(){if(!this.message.trim() || this.busy())return;const text=this.message;this.message='';this.history.update(h=>[...h,{role:'user',message:text}]);void this.call('chat',{conversationId:this.conversationId,requestId:crypto.randomUUID(),message:text});}
  act(action:UiAction){void this.call('actions',{conversationId:this.conversationId,...action});}
}
bootstrapApplication(App).catch(console.error);
