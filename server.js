// server/server.js
const http = require('http')
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const server = http.createServer((req, res) => { })

const { Server } = require('socket.io')
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  }
})

const linkCleanupSymbolsRegExp = /[\?|\#]/
const httpRegExp = /^http[s]?:\/\//

const jsLinks = [
  'javascript:void(0)',
  'about:blank',
]

const KnownLinks = new Set()
const LinksToExplore = new Set()

io.on('connection', (socket) => {
  console.log('A user connected')

  socket.on('start_crawl', async (message) => {
    KnownLinks.add(message)
    const res = await fetch(message)
    const html = await res.text()

    const dom = new JSDOM(html)

    const document = dom.window.document

    const links = document.querySelectorAll('a')
    const linksData = [...links].reduce((list, link) => {
      const linkAddress = link.href
      if (linkAddress) {
        const indexOfCleaning = linkAddress.search(linkCleanupSymbolsRegExp)
        const linkAddressClean = (indexOfCleaning === -1
          ? linkAddress
          : linkAddress.slice(0, indexOfCleaning)
        )

        list.push({
          url: linkAddressClean,
          text: link.text,
        })

        if (!jsLinks.includes(linkAddressClean)) {
          const linkWithOutDomain =  !httpRegExp.test(linkAddressClean)
          const fullLink = (linkWithOutDomain
            ? message.split('/').slice(0, 3).join('/') + linkAddressClean
            : linkAddressClean
          )
          if (
            !KnownLinks.has(fullLink)
            && !LinksToExplore.has(fullLink)
          ) {
            LinksToExplore.add(fullLink)
          }
        }
      }

      return list
    }, [])

    const result = {
      url: message,
      timeStamp: new Date().toISOString(),
      links: linksData,
    }

    console.warn([...KnownLinks])
    console.warn([...LinksToExplore])
    io.emit('start_crawl', result)
  })

  socket.on('disconnect', () => {
    console.log('A user disconnected')
  })
})

server.listen(3001, () => {
  console.log('WebSocket server listening on port 3001')
})
