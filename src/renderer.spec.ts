import {describe,it,expect} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {Renderer,DynamicRenderer} from './renderer';
import {By} from '@angular/platform-browser';
import {validTree} from './schema';
describe('Generative renderer',()=>{
  it('rejects unknown components',()=>expect(validTree({type:'script',props:{},children:[]})).toBe(false));
  it('renders verified employee data with interpolation',()=>{
    const fixture=TestBed.createComponent(Renderer);
    fixture.componentRef.setInput('node',{type:'employee-card',props:{data:{employeeId:'EMP-1',name:'<script>bad</script>',monthsInRole:0,performanceRating:0}},children:[]});
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('<script>bad</script>');
    expect(fixture.nativeElement.querySelector('script')).toBeNull();
  });
  it('emits only confirmed salary actions',()=>{
    const fixture=TestBed.createComponent(Renderer);const renderer=fixture.componentInstance;
    fixture.componentRef.setInput('node',{type:'form',props:{data:{actionId:'server-id',fields:{salary:'75000'},requiresConfirmation:true}},children:[]});
    const actions:unknown[]=[];renderer.action.subscribe(a=>actions.push(a));
    renderer.submit();expect(actions).toHaveLength(0);
    renderer.confirmed=true;renderer.submit();expect(actions).toEqual([{actionId:'server-id',input:{salary:'75000'},confirmed:true}]);
  });
  it('propagates nested form actions through the dynamic component registry',()=>{
    const fixture=TestBed.createComponent(DynamicRenderer);const actions:unknown[]=[];
    fixture.componentInstance.action.subscribe(a=>actions.push(a));
    fixture.componentRef.setInput('node',{type:'column',props:{},children:[{type:'form',props:{data:{actionId:'nested-id',employeeId:'EMP-1',fields:{department:'Finance'},requiresConfirmation:false}},children:[]}]});
    fixture.detectChanges();
    const nested=fixture.debugElement.queryAll(By.directive(Renderer)).map(e=>e.componentInstance as Renderer).find(r=>r.node().type==='form');
    expect(nested).toBeDefined();nested!.submit();
    expect(actions).toEqual([{actionId:'nested-id',input:{department:'Finance'},confirmed:false}]);
  });
});
