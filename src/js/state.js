// global state S and lookups: P(id) property, V() current view, opt(), statusProp(), isGroupProp(), firstPropId(), groupOpt()
const S = {
  tasks:new Map(), schema:defaultSchema(), views:defaultViews(), vid:'board', q:'',
  openId:null, drafts:new Set(), month:null, sel:null, more:{},
};
const P = id => S.schema.props.find(p => p.id === id);
const V = () => S.views.find(v => v.id === S.vid) || S.views[0];
const opt = (p, id) => p && p.options ? p.options.find(o => o.id === id) : null;
const statusProp = () => S.schema.props.find(p => p.type === 'status');
const isGroupProp = p => !!p && GROUPABLE(p.type);
const firstPropId = test => (S.schema.props.find(test) || {}).id || '';
const groupOpt = (p, g) => p && p.options && (p.options.find(o => o.group === g) || null);
