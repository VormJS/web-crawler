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

/** Number of fetch requests in parallel */
const CONCURRENCY_LIMIT = 10
/** Server status signal interval, in milliseconds */
const STATUS_INTERVAL = 2000

const httpRegExp = /^http[s]?:\/\//
const slashAtEndRegExp = /\/$/
const linkCleanupSymbolsRegExp = /[\?|\#]/

const jsLinks = [
  'javascript:/',
  'javascript:void(0);',
  'javascript:void(0)',
  'about:blank',
]

const KnownLinks = new Set()
const LinksToExplore = new Set()
const LinksQueue = new Set()

let paused = false
let stopped = true

const currentState = () => {
  if (stopped) {
    return 'stopped'
  } else if (paused) {
    return 'paused'
  } else {
    return 'active'
  }
}

let requestCounter = 0

const inspectURL = async (url) => {
  if (!KnownLinks.has(url)) {
    LinksQueue.add(url)
    LinksToExplore.delete(url)

    const res = await fetch(url)
    const html = await res.text()

    console.log('request made times: ' + ++requestCounter)

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
        ).replace(slashAtEndRegExp, '')

        list.push({
          url: linkAddressClean,
          text: link.text,
        })

        if (!jsLinks.includes(linkAddressClean)) {
          const linkWithOutDomain = !httpRegExp.test(linkAddressClean)
          const fullLink = (linkWithOutDomain
            ? url.split('/').slice(0, 3).join('/') + linkAddressClean
            : linkAddressClean
          )
          if (
            !KnownLinks.has(fullLink)
            && !LinksToExplore.has(fullLink)
            && !stopped
          ) {
            LinksToExplore.add(fullLink)
          }
        }
      }

      return list
    }, [])

    if (!stopped) {
      KnownLinks.add(url)
      LinksQueue.delete(url)
      io.emit('send_record', {
        url: url,
        timeStamp: new Date().toISOString(),
        links: linksData,
      })
    }
  } else {
    LinksQueue.delete(url)
    LinksToExplore.delete(url)
  }

  checkQueue()
}

const checkQueue = async () => {
  if (LinksToExplore.size && LinksQueue.size < CONCURRENCY_LIMIT && !paused && !stopped) {
    const nextURL = LinksToExplore.values().next().value
    inspectURL(nextURL)
    checkQueue()
  } else if (!LinksToExplore.size) {
    console.log('Request queue is empty')
    if (!LinksQueue.size) {
      paused = true
      stopped = true
    }
  }
}

const pulse = setInterval(() => {
  io.emit('status', {
    state: currentState(),
    urlsProcessed: KnownLinks.size,
    urlsLeft: LinksQueue.size + LinksToExplore.size,
  })
}, STATUS_INTERVAL)

io.on('connection', (socket) => {
  console.log('A user connected')

  socket.on('start_crawl', async (message) => {
    stopped = false
    paused = false
    inspectURL(message)
  })

  socket.on('pause', () => {
    paused = true
  })

  socket.on('resume', () => {
    paused = false
    checkQueue()
  })

  socket.on('stop', () => {
    requestCounter = 0
    stopped = true
    paused = true
    KnownLinks.clear()
    LinksToExplore.clear()
    LinksQueue.clear()
  })

  socket.on('disconnect', () => {
    console.log('A user disconnected')
  })
})

server.listen(3001, () => {
  console.log('WebSocket server listening on port 3001')
})
