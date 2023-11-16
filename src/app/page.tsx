'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button, Card, CardContent, CardHeader, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'

import styles from './page.module.css'

import io from 'socket.io-client';

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

export default function Home() {
  const [urlInput, setUrlInput] = useState('')
  const [urlInputError, setUrlInputError] = useState('')

  const [records, setRecords] = useState<Array<PageResult>>([])

  const startCrawling = useCallback(() => {
    socket.emit('start_crawl', urlInput);
  }, [urlInput])

  useEffect(() => {
    socket.on('start_crawl', (data) => {
      setRecords((prevRecords) => [...prevRecords, data]);
    });
  }, []);

  return (
    <main className={styles.main}>
      <Card sx={{ width: '80%', flexShrink: 0 }}>
        <CardContent>
          <Stack gap={3}>
            <TextField
              type='text'
              variant='outlined'
              fullWidth
              label='URL to scrap'
              error={!!urlInputError}
              helperText={urlInputError}
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

            <Button
              variant='outlined'
              disabled={!!urlInputError}
              onClick={startCrawling}
            >Go</Button>
          </Stack>
        </CardContent>
      </Card>

      <Stack gap={4} width='100%' mt={4} overflow={['scroll', 'unset']}>
        {records.map((record, index) => (
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
        ))}
      </Stack>
    </main>
  )
}
