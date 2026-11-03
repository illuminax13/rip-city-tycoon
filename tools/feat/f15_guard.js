/* Rip City transfer guard: while a #transfer= hash is being merged, the fresh page must not write its empty state over it */
(function(){if(!/^#transfer=/.test(location.hash))return;var X=window.__xfer={w:0},S=Storage.prototype,o=S.setItem,r=S.removeItem;
 X.restore=function(){S.setItem=o;S.removeItem=r};
 S.setItem=function(k){if(X.w||this!==localStorage||!/^pps/.test(k))return o.apply(this,arguments)};
 S.removeItem=function(k){if(X.w||this!==localStorage||!/^pps/.test(k))return r.apply(this,arguments)}})();
