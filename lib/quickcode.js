'use babel';

import { CompositeDisposable } from 'atom'
import request from 'request'
import cheerio from 'cheerio'
import googleIt from "google-it"

export default {

  request(script) {
    return {
      "accept":"application/json, text/javascript, */*; q=0.01",
      "accept-language":"en,fi;q=0.9",
      "cache-control":"no-cache",
      "content-type":"application/x-www-form-urlencoded; charset=UTF-8",
      "pragma":"no-cache",
      "x-requested-with":"XMLHttpRequest",
      "body": script ,
      "method":"POST"
    }
  },
  subscriptions: null,

  activate() {
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'quickcode:fetch': () => this.fetch()
    }))
  },

  deactivate() {
    this.subscriptions.dispose()
  },
  stripHtml(html)
  {
     var tmp = document.createElement("DIV");
     tmp.innerHTML = html;
     return tmp.textContent || tmp.innerText || "";
  },
  fetch() {
    let editor
    let self = this
    if (editor = atom.workspace.getActiveTextEditor()) {
      let query = editor.getSelectedText()
      let language = editor.getGrammar().name
      self.search(query, language).then((url) => {
        atom.notifications.addSuccess('Found google results!')
        return self.download(url)
      }).then((html) => {
        let answer = self.scrape(html)
        if (answer === '') {
          atom.notifications.addWarning('No answer found :(')
        } else {
          atom.notifications.addSuccess('Found snippet!')
          //editor.insertText(answer)
          //editor.insertText(self.jsnicer(answer).then((js) => {return js;}))
          fetch(
            "http://jsnice.org/beautify?pretty=1&rename=1&types=1&packers=1&transpile=0&suggest=0",
            this.request(this.stripHtml(answer))
          ).then(r =>  r.json().then(data => (
            editor.insertText(data.js)
          )))
        }
      }).catch((error) => {
        atom.notifications.addWarning(error.reason)
      })
    }
  },
search(query, language) {
  return new Promise((resolve, reject) => {
    let searchString = `${query} in ${language} site:stackoverflow.com`

    googleIt({'query': searchString}).then(res => {
      resolve(res[0].link)
    }).catch(e => {
      reject({
        reason: 'A search error has occured :('
      })
    })
  })
},
scrape(html) {
  $ = cheerio.load(html)
  return $('div.accepted-answer pre code').text()
},
  download(url) {
    return new Promise((resolve, reject) => {
      request(url, (error, response, body) => {
        if (!error && response.statusCode == 200) {
          resolve(body)
        } else {
          reject({
            reason: 'Unable to download page'
          })
        }
      })
    })
  }
};
