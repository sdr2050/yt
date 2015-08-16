
function extract_ids(str) {
  if (str == null) return str;
  return str.replace(/.*?([\?&]v=|[\?&]video_id=|youtu.be\/)([^&\?#\s]+)[\S]*/g, '$2');
}

function get() {
  var video_id = extract_ids(document.getElementById('video_id').value);
  window.open('view-source:https://www.youtube.com/annotations_invideo?features=1&legacy=1&video_id='+video_id);
  // legacy=0 appears to only fetch InVideo annotations
}

function gethelp(e) {
  if (e.keyCode == 13) get();
}

function checkxml() {
  var data = document.getElementById('data').value;
  var warn = document.getElementById('ampersand_warning');
  var ret = /&(?!([a-zA-Z][a-zA-Z0-9]*|(#\d+));)/.exec(data);
  if (ret == null) {
    warn.style.visibility = 'hidden';
  }
  else {
    warn.style.visibility = 'visible';
  }
}

function getxml() {
  var data = document.getElementById('data').value;
  if (!data) return alert('You must supply the XML data!');
  data = data.replace(/<\?xml[^>]*\?>/, ''); //https://bugzilla.mozilla.org/show_bug.cgi?id=336551
  data = data.replace(/annotations>/g, 'updatedItems>'); //rename <annotations> to <updatedItems>

  // insert requestHeader and authenticationHeader, if not already present
  var ret = /<authenticationHeader/.exec(data);
  if (ret == null) {
    data = data.replace(/<document.*?>/, '$&<requestHeader video_id="" /><authenticationHeader auth_token="" />');
  }

  // remove unknown annotations (InVideo Programming, Cards, etc.)
  data = data.replace(/<annotation [^>]*?id="(?!annotation_)[\S\s]*?<\/annotation>/g, '');

  return data;
}

function update() {
  var ids = document.getElementById('ids');
  ids.value = extract_ids(ids.value);

  var auth_token = document.getElementById('auth_token').value;
  if (!auth_token) return alert('You must get an auth token before proceeding!');

  var data = getxml();
  if (!data) return;
  var ret = data.match(/<annotation /g);
  var num = (ret != null)?ret.length:0;
  ids = ids.value.split('\n');
  ids.forEach(function(id) {
    var ret = /^([^ #]+)/.exec(id);
    if (ret == null) return;
    var id = ret[1];

    // insert video_id and auth_token into xml
    data = data.replace(/<requestHeader(.*?)video_id=".*?"(.*?)>/, '<requestHeader$1video_id="'+id+'"$2>');
    data = data.replace(/<authenticationHeader(.*?)auth_token=".*?"(.*?)>/, '<authenticationHeader$1auth_token="'+auth_token+'"$2>');
    console.log(data);

    var xhr = new XMLHttpRequest();
    xhr.withCredentials = true;
    xhr.open('POST', 'https://www.youtube.com/annotations_auth/update2', true);
    xhr.send(data);

    var link = document.createElement('a');
    link.href = 'https://www.youtube.com/my_videos_annotate?v='+id;
    link.appendChild(document.createTextNode(id));
    log('Copying '+num+' annotations to ', link);
  });
}

function publish() {
  var ids = document.getElementById('ids');
  ids.value = extract_ids(ids.value);

  var auth_token = document.getElementById('auth_token').value;
  if (!auth_token) return alert('You must get an auth token before proceeding!');

  ids = ids.value.split('\n');
  ids.forEach(function(id) {
    var ret = /^([^ #]+)/.exec(id);
    if (ret == null) return;
    var id = ret[1];

    // publish
    var pubdata = '<document><requestHeader video_id="'+id+'" /><authenticationHeader auth_token="'+auth_token+'" /></document>';
    console.log(pubdata);

    var xhr = new XMLHttpRequest();
    xhr.withCredentials = true;
    xhr.open('POST', 'https://www.youtube.com/annotations_auth/publish2', true);
    xhr.send(pubdata);

    var link = document.createElement('a');
    link.href = 'https://www.youtube.com/watch?v='+id;
    link.appendChild(document.createTextNode(id));
    log('Publishing ', link);
  });
}

function clearvideo() {
  var auth_token = document.getElementById('auth_token').value;
  if (!auth_token) return alert('You must get an auth token before proceeding!');

  var data = getxml();
  if (!data) return;
  var id = extract_ids(document.getElementById('video_id').value);
  if (!id) id = extract_ids(prompt('Input video id or url:'));
  if (!id) return;

  if (!confirm('Are you sure you want to delete all annotations from video with id '+id+'?')) return;

  // extract annotation ids
  var deldata = '<document><requestHeader video_id="'+id+'" /><authenticationHeader auth_token="'+auth_token+'" /><deletedItems>';
  var regex = /<annotation( author=".*?")?( id=".*?")/ig;
  var num = 0;
  while ((ret=regex.exec(data)) != null) {
    num++;
    if (!ret[1]) ret[1] = ' author=""'; // author is only included when fetching annotations from old videos and using the annotation editor (but author must be present when deleting, so guessing empty author, which won't work if the annotation is super old; in this case, fetch the annotations via the annotation editor by using the greasemonkey script)
    deldata += '<deletedItem'+ret[1]+ret[2]+' />';
  }
  deldata += '</deletedItems></document>';
  console.log(deldata);

  var xhr = new XMLHttpRequest();
  xhr.withCredentials = true;
  xhr.open('POST', 'https://www.youtube.com/annotations_auth/update2', true);
  xhr.send(deldata);

  var link = document.createElement('a');
  link.href = 'https://www.youtube.com/my_videos_annotate?v='+id;
  link.appendChild(document.createTextNode(id));
  log('Deleting '+num+' annotations from ', link);

  // publish in a moment
  setTimeout(function() {
    var pubdata = '<document><requestHeader video_id="'+id+'" /><authenticationHeader auth_token="'+auth_token+'" /></document>';
    console.log(pubdata);

    var xhr = new XMLHttpRequest();
    xhr.withCredentials = true;
    xhr.open('POST', 'https://www.youtube.com/annotations_auth/publish2', true);
    xhr.send(pubdata);

    var link = document.createElement('a');
    link.href = 'https://www.youtube.com/watch?v='+id;
    link.appendChild(document.createTextNode(id));
    log('Publishing ', link);
  }, 1000);
}

function log(s, e) {
  var log = document.getElementById('log');
  var li = document.createElement('li');
  li.appendChild(document.createTextNode(s));
  if (e) li.appendChild(e);
  li.appendChild(document.createTextNode('.'));
  log.appendChild(li);
}
