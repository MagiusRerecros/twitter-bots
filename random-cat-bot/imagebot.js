console.log('Starting Cat image bot...');

var fs = require('fs');
var request = require('request');
var twit = require('twit');
var config = require('./config');

var T = new Twit(config);

setInterval(doCatThings, 1000*60*60);

var stream = T.stream('statuses/filter', { track: '#MewgiBot' });
stream.on('tweet', tweetEvent);

doCatThings();

function tweetEvent(eventMsg) {
  var json = JSON.stringify(eventMsg, null, 2);
  fs.writeFile('tweet.json', json);

  if (eventMsg.user.screen_name === 'MewgiBot') {
    console.log('Detected own tweet, ignoring.');
    return;
  }
  else if (eventMsg.retweeted_status) {
    console.log('Detected a retweet, ignoring.');
    return;
  }
  else {
    T.post('statuses/retweet/:id', { id: eventMsg.id_str }, function (err, data, response) {
      if (err) {
        console.error('Twit retweet error: ' + err);
        return;
      }

      console.log('Retweeted: ' + data.text);
    });
  }
}

function doCatThings() {
  console.log('Doing cat things');
  downloadCat();
  tweetCat();
}

function tweetCat() {
  var filename = 'cat.png'
  var image = fs.readFileSync(filename, { encoding: 'base64' });

  T.post('media/upload', { media_data: image }, uploaded);

  function uploaded(err, data, response) {
    if (err) {
      console.error('Twit media upload error: ' + err);
      return;
    }

    var tweet = 'Get mew\'d on! #MewgiBot';
    var mediaIdStr = data.media_id_string;
    var params = { status: tweet, media_ids: [mediaIdStr] };
    T.post('statuses/update', params, tweeted);

    function tweeted(err, data, response) {
      if (err) {
        console.error('Twit tweet error: ' + err);
        return;
      }
    }
  }
}

function downloadCat() {
  var apiUrl = "http://random.cat/meow";

  request(apiUrl, requested);

  function requested(error, response, body) {
    if (!error && response.statusCode === 200) {
      var response = JSON.parse(body);
      var url = response.file;

      console.log(url);

      var download = function (uri, filename, callback) {
        request.head(uri, function(err, res, body) {
          console.log('Cat Request: content-type:', res.headers['content-type']);
          console.log('Cat Request: content-length:', res.headers['content-length']);

          request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
        });
      };

      console.log('Attempting download of ' + url);
      var catPicFile = 'cat.png';
      download(url, catPicFile, function() { console.log('Cat downloaded.'); });
    }
    else {
      console.error("Cat Request: got an error: ", error);
      console.error("Cat Request: status code of error: ", response.statusCode);
    }
  };
}
