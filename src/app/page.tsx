'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'

import styles from './page.module.css'

import io from 'socket.io-client'

const formatDateTime = (timeStamp: string) => Intl.DateTimeFormat('default', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: 'numeric',
  second: '2-digit',
  hour12: false,
}).format(new Date(timeStamp))

const socket = io('http://localhost:3001', {
  withCredentials: true,
})

const httpRegExp = /^http[s]?:\/\//

type PageResult = {
  url: string
  timeStamp: string
  links: Array<{
    url: string
    text: string
  }>
}

type ServerStatus = {
  state: 'active' | 'paused' | 'stopped'
  urlsProcessed: number
  urlsLeft: number
}

const STORAGE: { records: Array<PageResult> } = {
  records: [],
}

export default function Home() {
  const [urlInput, setUrlInput] = useState('')
  const [urlInputError, setUrlInputError] = useState('')
  const [serverStatus, setServerStatus] = useState<ServerStatus & { connected: boolean }>({
    connected: false,
    state: 'stopped',
    urlsProcessed: 0,
    urlsLeft: 0,
  })

  const [searchInProgress, setSearchInProgress] = useState(false)
  const [paused, setPaused] = useState(false)

  const [records, setRecords] = useState<Array<PageResult>>([])

  const startCrawling = useCallback(() => {
    setSearchInProgress(true)
    socket.emit('start_crawl', urlInput)
  }, [urlInput])

  const pause = useCallback(() => {
    if (paused) {
      setPaused(false)
      socket.emit('resume')
    } else {
      setPaused(true)
      socket.emit('pause')
    }
  }, [paused])

  const clear = useCallback(() => {
    socket.emit('stop')
    setSearchInProgress(false)
    setPaused(false)
    setUrlInput('')
    STORAGE.records = []
    setRecords([])
  }, [])

  useEffect(() => {
    socket.on('send_record', (data: PageResult) => {
      STORAGE.records.push(data)
    })
    socket.on('status', (data: ServerStatus) => {
      setServerStatus({
        connected: true,
        ...data,
      })
    })
  }, [])

  useEffect(() => {
    if (STORAGE.records.length !== records.length) {
      setRecords(() => [...STORAGE.records])
    }
  }, [serverStatus, records.length])

  const recordsList = useMemo(() => {
    return records.map((record, index) => (
      <Card key={index} sx={{ flexShrink: 0 }}>
        <CardHeader
          title={(
            <Stack direction='row' gap={4}>
              <Typography variant='h6'>#{index + 1}</Typography>
              <Typography variant='h6'>URL: {record.url}</Typography>
              <Typography variant='h6'>Loadtime: {formatDateTime(record.timeStamp)}</Typography>
              <Typography variant='h6'>Links: {record.links.length}</Typography>
            </Stack>
          )}
        />

        {record.links.length ? (
          <CardContent>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell width={80}>Link #</TableCell>
                  <TableCell>URL</TableCell>
                  <TableCell>Text</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {record.links.map((link, linkIndex) => (
                  <TableRow key={linkIndex}>
                    <TableCell>{linkIndex + 1}</TableCell>
                    <TableCell>{link.url}</TableCell>
                    <TableCell>{link.text}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        ) : null}
      </Card>
    ))
  }, [records])

  return (
    <main className={styles.main}>
      <Card sx={{ width: '100%', flexShrink: 0 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={8}>
              <Stack gap={3}>
                <TextField
                  type='text'
                  variant='outlined'
                  fullWidth
                  label='URL to scrap'
                  error={!!urlInputError}
                  helperText={urlInputError}
                  disabled={searchInProgress}
                  value={urlInput}
                  onChange={(event) => {
                    const inputText = event.target.value

                    if (!httpRegExp.test(inputText)) {
                      setUrlInputError('Invalid link, should be in format http(s)://[page_address]')
                    } else {
                      setUrlInputError('')
                    }
                    setUrlInput(event.target.value)
                  }}
                />

                {searchInProgress ? (
                  <Stack direction='row' gap={4}>
                    <Button
                      variant='outlined'
                      fullWidth
                      onClick={pause}
                    >{paused ? 'Resume' : 'Pause'}</Button>

                    <Button
                      variant='contained'
                      color='primary'
                      fullWidth
                      onClick={clear}
                    >Clear</Button>
                  </Stack>
                ) : (
                  <Button
                    variant='outlined'
                    disabled={!urlInput || !!urlInputError}
                    onClick={startCrawling}
                  >Go</Button>
                )}
              </Stack>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Stack alignItems='flex-end'>
                <Typography variant='h6'>Server Status</Typography>
                <Typography variant='subtitle2'>connected: {serverStatus.connected ? 'V' : 'X'}</Typography>
                <Typography variant='subtitle2'>state: {serverStatus.state}</Typography>
                <Typography variant='subtitle2'>urls processed: {serverStatus.urlsProcessed}</Typography>
                <Typography variant='subtitle2'>urls left to explore: {serverStatus.urlsLeft}</Typography>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Stack gap={3} width='100%' mt={4} sx={{ overflowY: 'scroll' }} flexGrow={1}>
        {recordsList}
      </Stack>
    </main>
  )
}
