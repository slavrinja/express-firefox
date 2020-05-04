# Firefox extension for Express app

## Differences from Chrome extension
 
### Manifest.json

* `permissions.declarativeContent` removed. [Alternatives](https://stackoverflow.com/questions/39252384/is-there-a-ff-equivalent-to-chrome-declarativecontent-onpagechanged)
* `page_action` renamed to `browser_action`

### all *.js files

* `chrome` renamed to `browser` 

### scripts/background/eventpage.js 

* `onPageChanged` listener need to be reworked because it use `declarativeContent`
