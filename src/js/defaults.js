// default schema (properties, options, color rules) and default views for a fresh database
const DEFAULT_CATS = [
  {id:'business',name:'Business',color:'blue'},{id:'job',name:'Job',color:'gray'},{id:'karriere',name:'Karriere',color:'brown'},
  {id:'tech',name:'Tech',color:'orange'},{id:'iq',name:'IQ Maxing',color:'pink'},{id:'looks',name:'Looksmaxing',color:'blue'},
  {id:'training',name:'Training',color:'purple'},{id:'health',name:'Healthmaxing',color:'green'},{id:'opsec',name:'OPSEC',color:'red'},
  {id:'osint',name:'OSINT',color:'orange'},{id:'termine',name:'Termine',color:'gray'},
];
function defaultSchema(cats){
  return {
    props:[
      {id:'title',name:'Name',type:'title'},
      {id:'priority',name:'Priority',type:'select',options:[{id:'sh',name:'Sehr hoch',color:'orange'},{id:'h',name:'Hoch',color:'pink'},{id:'mh',name:'Mittel-hoch',color:'purple'},{id:'m',name:'Mittel',color:'blue'},{id:'n',name:'Niedrig',color:'gray'}]},
      {id:'date',name:'Date',type:'date'},
      {id:'status',name:'Status',type:'status',options:[{id:'nb',name:'Nicht begonnen',color:'gray',group:'todo'},{id:'ia',name:'In Arbeit',color:'blue',group:'doing'},{id:'er',name:'Erledigt',color:'green',group:'done'}]},
      {id:'category',name:'Category',type:'select',options:(cats || DEFAULT_CATS).map(c => ({id:c.id,name:c.name,color:c.color}))},
      {id:'created',name:'Created time',type:'created_time'},
      {id:'updated',name:'Last edited time',type:'last_edited_time'},
    ],
    colorRules:[
      {id:'r1',prop:'priority',op:'is',val:'sh',color:'orange'},{id:'r2',prop:'priority',op:'is',val:'h',color:'pink'},
      {id:'r3',prop:'priority',op:'is',val:'mh',color:'purple'},{id:'r4',prop:'priority',op:'is',val:'m',color:'blue'},
    ],
  };
}
function defaultViews(){
  return [
    {id:'board',name:'Board view',type:'board',groupBy:'category',cols:['title','status','priority','date'],hidden:['created','updated'],filters:[],sorts:[]},
    {id:'table',name:'Table',type:'table',cols:['title','priority','date','status','category','created','updated'],hidden:[],widths:{},filters:[],sorts:[{prop:'priority',dir:'asc'}]},
    {id:'cal',name:'Calendar',type:'calendar',dateProp:'date',cols:['title','priority','status','category'],hidden:['date','created','updated'],filters:[],sorts:[],scope:'month'},
  ];
}
