import {Component, input, output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {UiNode, UiAction, registry} from './schema';

@Component({selector:'employee-ui', standalone:true, imports:[CommonModule, FormsModule], template:`
  @if (!known()) { <p role="alert">Unsupported UI component.</p> }
  @else {
    @switch(node().type) {
      @case('column') { <div class="column">@for(child of node().children; track $index) {<employee-ui [node]="child" (action)="forward($event)"/>}</div> }
      @case('row') { <div class="row">@for(child of node().children; track $index) {<employee-ui [node]="child" (action)="forward($event)"/>}</div> }
      @case('heading') { <h2>{{data()}}</h2> }
      @case('text') { <p>{{data()}}</p> }
      @case('employee-card') {
        <article><span class="eyebrow">EMPLOYEE · {{data().employeeId}}</span><h2>{{data().name}}</h2>
        <p>{{data().designation || 'Designation not supplied'}} · {{data().department || 'Department not supplied'}}</p>
        <dl><dt>Salary</dt><dd>{{data().salary ?? 'Not supplied'}}</dd><dt>Months in role</dt><dd>{{data().monthsInRole ?? 'Not supplied'}}</dd><dt>Performance rating</dt><dd>{{data().performanceRating ?? 'Not supplied'}}</dd></dl></article>
      }
      @case('promotion-card') { <article><span class="eyebrow">PROMOTION ASSESSMENT</span><h2>{{data().employeeName}}</h2><strong [class.eligible]="data().eligible">{{data().eligible === null ? 'Policy unavailable' : data().eligible ? 'Eligible' : 'Not eligible'}}</strong><p>{{data().explanation}}</p></article> }
      @case('employee-table') {
        <div class="table-wrap"><table><thead><tr>@for(key of columns(); track key){<th>{{key}}</th>}</tr></thead><tbody>@for(row of data(); track $index){<tr>@for(key of columns(); track key){<td>{{row[key]}}</td>}</tr>} @empty{<tr><td>No employees found.</td></tr>}</tbody></table></div>
      }
      @case('chart') { <article><h2>Employee dashboard</h2><p>{{data().employeeCount}} employees · {{data().eligibleCount}} eligible for promotion</p>@for(entry of departmentEntries(); track entry[0]){<p>{{entry[0]}} · {{entry[1].count}} employees · {{entry[1].ratedCount}} rated</p>@if(entry[1].ratedCount){<p>Average rating {{entry[1].averagePerformance | number:'1.1-2'}}</p><meter min="0" max="5" [value]="entry[1].averagePerformance">{{entry[1].averagePerformance}}</meter>} @else {<p>No performance data</p>}}</article> }
      @case('form') {
        <form (ngSubmit)="submit()"><h3>Update {{data().employeeId}}</h3>
          @for(key of formFields(); track key){<label>{{key}}<input [type]="key === 'salary' ? 'number' : 'text'" [name]="key" [ngModel]="values[key] ?? data().fields[key] ?? ''" (ngModelChange)="values[key]=$event" [required]="!emptyFields()" [attr.min]="key === 'salary' ? 0 : null" [attr.step]="key === 'salary' ? '0.01' : null" maxlength="150"></label>}
          @if(data().requiresConfirmation){<label><input type="checkbox" name="confirmed" [(ngModel)]="confirmed" required> I confirm these employee changes.</label>}
          <button type="submit" [disabled]="sent || (data().requiresConfirmation && !confirmed)">Save changes</button>
        </form>
      }
      @case('button') { <button disabled>{{data().label || 'Action unavailable'}}</button> }
      @default { <article><p>{{data() | json}}</p>@for(child of node().children; track $index){<employee-ui [node]="child" (action)="forward($event)"/>}</article> }
    }
  }
`})
export class Renderer {
  node = input.required<UiNode>();
  action = output<UiAction>();
  values: Record<string,string|undefined> = {}; confirmed = false; sent = false;
  onAction = input<((action:UiAction)=>void)|undefined>();
  forward(event:UiAction){this.action.emit(event);this.onAction()?.(event);}
  known() { return registry.has(this.node().type); }
  data(): any { return this.node().props['data']; }
  columns() { return this.data()?.length ? Object.keys(this.data()[0]).filter(k=>k!=='id') : []; }
  departmentEntries(): [string,any][] {return Object.entries(this.data().departments || {});}
  emptyFields() {return Object.keys(this.data().fields).length===0;}
  formFields() {return this.emptyFields() ? ['name','department','designation','salary'] : Object.keys(this.data().fields);}
  submit() {
    if(this.sent || (this.data().requiresConfirmation && !this.confirmed)) return;
    const fields = Object.fromEntries(this.formFields().map(k=>[k,String(this.values[k] ?? this.data().fields[k] ?? '')]).filter(([,v])=>v.trim()!==''));
    if(!Object.keys(fields).length) return;
    this.forward({actionId:this.data().actionId,input:fields,confirmed:this.confirmed});
  }
}

/** Schema types resolve exclusively to compiled, registered Angular components. */
export const componentRegistry = new Map([...registry].map(type=>[type,Renderer]));
@Component({selector:'employee-dynamic-ui',standalone:true,imports:[CommonModule],template:`
  @if(component()){<ng-container *ngComponentOutlet="component(); inputs: inputs()"/>}
  @else{<p role="alert">Unsupported UI component.</p>}
`})
export class DynamicRenderer {
  node=input.required<UiNode>(); action=output<UiAction>();
  component(){return componentRegistry.get(this.node().type) ?? null;}
  private forward=(event:UiAction)=>this.action.emit(event);
  inputs(){return {node:this.node(),onAction:this.forward};}
}
