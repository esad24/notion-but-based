// TYPES, HAS_OPTS/GROUPABLE/IS_DATEISH, COLORS, status GROUPS, number FORMATS, view LAYOUTS, default column widths DEF_W
const TYPES = [['text','Text'],['number','Number'],['select','Select'],['multi_select','Multi-select'],['status','Status'],['date','Date'],['checkbox','Checkbox'],['url','URL'],['email','Email'],['phone','Phone'],['created_time','Created time'],['last_edited_time','Last edited time']];
const typeLabel = t => t === 'title' ? 'Title' : (TYPES.find(x => x[0] === t) || [, t])[1];
const HAS_OPTS = t => t === 'select' || t === 'multi_select' || t === 'status';
const GROUPABLE = t => t === 'select' || t === 'status'; // types a board or list can group by
const IS_DATEISH = t => t === 'date' || t === 'created_time' || t === 'last_edited_time';
const COLORS = ['gray','slate','brown','orange','yellow','lime','green','teal','cyan','blue','indigo','purple','fuchsia','pink','red'];
const isCustom = c => typeof c === 'string' && /^h-[0-9a-f]{6}$/.test(c);
const colorName = c => isCustom(c) ? 'Custom' : cap(c);
const GROUPS = [['todo','To-do'],['doing','In progress'],['done','Complete']];
const FORMATS = [['','Number'],['comma','Number with commas'],['percent','Percent'],['euro','Euro'],['dollar','US dollar']];
const LAYOUTS = [['table','Table',IC.table],['board','Board',IC.board],['calendar','Calendar',IC.calendar],['list','List',IC.list]];
const layoutIcon = t => (LAYOUTS.find(l => l[0] === t) || LAYOUTS[0])[2];
const DEF_W = {title:300,text:220,number:110,select:160,multi_select:220,status:160,date:170,checkbox:90,url:200,email:200,phone:150,created_time:200,last_edited_time:200};
