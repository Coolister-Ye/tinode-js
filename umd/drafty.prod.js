!function(t){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=t();else if("function"==typeof define&&define.amd)define([],t);else{("undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this).Drafty=t()}}(function(){const t=[{name:"ST",start:/(?:^|\W)(\*)[^\s*]/,end:/[^\s*](\*)(?=$|\W)/},{name:"EM",start:/(?:^|[\W_])(_)[^\s_]/,end:/[^\s_](_)(?=$|[\W_])/},{name:"DL",start:/(?:^|\W)(~)[^\s~]/,end:/[^\s~](~)(?=$|\W)/},{name:"CO",start:/(?:^|\W)(`)[^`]/,end:/[^`](`)(?=$|\W)/}],e=[{name:"LN",dataName:"url",pack:function(t){return/^[a-z]+:\/\//i.test(t)||(t="http://"+t),{url:t}},re:/(https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b(?:[-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)/g},{name:"MN",dataName:"val",pack:function(t){return{val:t.slice(1)}},re:/\B@(\w\w+)/g},{name:"HT",dataName:"val",pack:function(t){return{val:t.slice(1)}},re:/\B#(\w\w+)/g}],n={ST:{name:"b",isVoid:!1},EM:{name:"i",isVoid:!1},DL:{name:"del",isVoid:!1},CO:{name:"tt",isVoid:!1},BR:{name:"br",isVoid:!0},LN:{name:"a",isVoid:!1},MN:{name:"a",isVoid:!1},HT:{name:"a",isVoid:!1},IM:{name:"img",isVoid:!0}};function r(t,e){var n;try{n=atob(t)}catch(t){console.log("Drafty: failed to decode base64-encoded object",t.message),n=atob("")}for(var r=n.length,a=new ArrayBuffer(r),i=new Uint8Array(a),o=0;o<r;o++)i[o]=n.charCodeAt(o);return URL.createObjectURL(new Blob([a],{type:e}))}var a={ST:{open:function(){return"<b>"},close:function(){return"</b>"}},EM:{open:function(){return"<i>"},close:function(){return"</i>"}},DL:{open:function(){return"<del>"},close:function(){return"</del>"}},CO:{open:function(){return"<tt>"},close:function(){return"</tt>"}},BR:{open:function(){return""},close:function(){return"<br/>"}},LN:{open:function(t){return'<a href="'+t.url+'">'},close:function(t){return"</a>"},props:function(t){return{href:t.url,target:"_blank"}}},MN:{open:function(t){return'<a href="#'+t.val+'">'},close:function(t){return"</a>"},props:function(t){return{name:t.val}}},HT:{open:function(t){return'<a href="#'+t.val+'">'},close:function(t){return"</a>"},props:function(t){return{name:t.val}}},IM:{open:function(t){var e=r(t.val,t.mime),n=t.ref?t.ref:e,a=(t.name?'<a href="'+n+'" download="'+t.name+'">':"")+'<img src="'+e+'"'+(t.width?' width="'+t.width+'"':"")+(t.height?' height="'+t.height+'"':"")+' border="0" />';return console.log("open: "+a),a},close:function(t){return t.name?"</a>":""},props:function(t){return{src:r(t.val,t.mime),title:t.name,"data-width":t.width,"data-height":t.height,"data-name":t.name,"data-size":.75*t.val.length|0,"data-mime":t.mime}}}};return{parse:function(n){if("string"!=typeof n)return null;var r=n.split(/\r?\n/),a=[],i={},o=[];r.map(function(n){var r,u,f=[];if(t.map(function(t){f=f.concat(function(t,e,n,r){for(var a=[],i=0,o=t.slice(0);o.length>0;){var u=e.exec(o);if(null==u)break;var f=u.index+u[0].lastIndexOf(u[1]);o=o.slice(f+1),i=(f+=i)+1;var l=n?n.exec(o):null;if(null==l)break;var c=l.index+l[0].indexOf(l[1]);o=o.slice(c+1),i=(c+=i)+1,a.push({text:t.slice(f+1,c),children:[],start:f,end:c,type:r})}return a}(n,t.start,t.end,t.name))}),0==f.length)u={txt:n};else{f.sort(function(t,e){return t.start-e.start}),f=function t(e){if(0==e.length)return[];for(var n=[e[0]],r=e[0],a=1;a<e.length;a++)e[a].start>r.end?(n.push(e[a]),r=e[a]):e[a].end<r.end&&r.children.push(e[a]);for(var a in n)n[a].children=t(n[a].children);return n}(f);var l=function t(e,n){var r="",a=[];for(var i in e){var o=e[i];if(!o.text){var u=t(o.children,r.length+n);o.text=u.txt,a=a.concat(u.fmt)}o.type&&a.push({at:r.length+n,len:o.text.length,tp:o.type}),r+=o.text}return{txt:r,fmt:a}}(function t(e,n,r,a){var i=[];if(0==a.length)return[];for(var o in a){var u=a[o];u.start>n&&i.push({text:e.slice(n,u.start)});var f={type:u.type},l=t(e,u.start+1,u.end-1,u.children);l.length>0?f.children=l:f.text=u.text,i.push(f),n=u.end+1}return n<r&&i.push({text:e.slice(n,r)}),i}(n,0,n.length,f),0);u={txt:l.txt,fmt:l.fmt}}if((r=function(t){var n,r=[];if(e.map(function(e){for(;null!==(n=e.re.exec(t));)r.push({offset:n.index,len:n[0].length,unique:n[0],data:e.pack(n[0]),type:e.name})}),0==r.length)return r;r.sort(function(t,e){return t.offset-e.offset});var a=-1;return r=r.filter(function(t){var e=t.offset>a;return a=t.offset+t.len,e})}(u.txt)).length>0){var c=[];for(var s in r){var d=r[s],h=i[d.unique];h||(h=a.length,i[d.unique]=h,a.push({tp:d.type,data:d.data})),c.push({at:d.offset,len:d.len,key:h})}u.ent=c}o.push(u)});var u={txt:""};if(o.length>0){u.txt=o[0].txt,u.fmt=(o[0].fmt||[]).concat(o[0].ent||[]);for(var f=1;f<o.length;f++){var l=o[f],c=u.txt.length+1;u.fmt.push({tp:"BR",len:1,at:c-1}),u.txt+=" "+l.txt,l.fmt&&(u.fmt=u.fmt.concat(l.fmt.map(function(t){return t.at+=c,t}))),l.ent&&(u.fmt=u.fmt.concat(l.ent.map(function(t){return t.at+=c,t})))}0==u.fmt.length&&delete u.fmt,a.length>0&&(u.ent=a)}return u},insertImage:function(t,e,n,r,a,i,o,u,f){return(t=t||{txt:" "}).ent=t.ent||[],t.fmt=t.fmt||[],t.fmt.push({at:e,len:1,key:t.ent.length}),t.ent.push({tp:"IM",data:{mime:n,val:r,width:a,height:i,name:o,ref:f,size:0|u}}),t},attachFile:function(t,e,n,r,a,i){(t=t||{txt:""}).ent=t.ent||[],t.fmt=t.fmt||[],t.fmt.push({at:-1,len:0,key:t.ent.length});let o={tp:"EX",data:{mime:e,val:n,name:r,ref:i,size:0|a}};return i instanceof Promise&&i.then(t=>{o.data.ref=t},t=>{}),t.ent.push(o),t},UNSAFE_toHTML:function(t){var e,n,r,{txt:i,fmt:o,ent:u}=t,f=[];if(o)for(var l in o){var c,s=o[l],d=s.tp;if(!d){var h=u[s.key];h&&(d=h.tp,c=h.data)}a[d]&&(f.push({idx:s.at+s.len,what:a[d].close(c)}),f.push({idx:s.at,what:a[d].open(c)}))}for(var l in f.sort(function(t,e){return e.idx-t.idx}),f)f[l].what&&(e=i,n=f[l].idx,r=f[l].what,i=e.slice(0,n)+r+e.slice(n));return i},format:function(t,e,r){var{txt:a,fmt:i,ent:o}=t;if(a=a||"",!i)return[a];var u=[].concat(i);return u.map(function(t){t.at=t.at||0,t.len=t.len||0}),u.sort(function(t,e){return t.at-e.at==0?e.len-t.len:t.at-e.at}),u=u.map(function(t){var e,n=t.tp;return n||(t.key=t.key||0,e=o[t.key].data,n=o[t.key].tp),{tp:n,data:e,at:t.at,len:t.len}}),function t(e,r,a,i,o,u){for(var f=[],l=0;l<i.length;l++){var c=i[l];r<c.at&&(f.push(o.call(u,null,void 0,e.slice(r,c.at))),r=c.at);for(var s=[],d=l+1;d<i.length&&i[d].at<c.at+c.len;d++)s.push(i[d]),l=d;var h=n[c.tp]||{};f.push(o.call(u,c.tp,c.data,h.isVoid?null:t(e,r,c.at+c.len,s,o,u))),r=c.at+c.len}return r<a&&f.push(o.call(u,null,void 0,e.slice(r,a))),f}(a,0,a.length,u,e,r)},toPlainText:function(t){return t.txt},isPlainText:function(t){return!(t.fmt||t.ent)},hasAttachments:function(t){if(t.ent&&t.ent.length>0)for(var e in t.ent)if("EX"==t.ent[e].tp)return!0;return!1},attachments:function(t,e,n){if(t.ent&&t.ent.length>0)for(var r in t.ent)"EX"==t.ent[r].tp&&e.call(n,t.ent[r].data,r)},getDownloadUrl:function(t){let e=null;return t.val?e=r(t.val,t.mime):"string"==typeof t.ref&&(e=t.ref),e},isUploading:function(t){return t.ref instanceof Promise},getPreviewUrl:function(t){return t.val?r(t.val,t.mime):null},getEntitySize:function(t){return t.size?t.size:t.val?.75*t.val.length|0:0},getEntityMimeType:function(t){return t.mime||"text/plain"},tagName:function(t){return n[t]?n[t].name:void 0},attrValue:function(t,e){if(e&&a[t])return a[t].props(e)},getContentType:function(){return"text/x-drafty"}}});