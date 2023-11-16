'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button, Stack, TextField, Typography } from '@mui/material'

import styles from './page.module.css'

import io from 'socket.io-client';

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
      <Stack gap={4} width='80%'>
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

      <Stack>
        {records.map((record, index) => (
          <Stack key={index}>
            <Stack direction='row' gap={4}>
              <Typography>{record.url}</Typography>
              <Typography>{record.timeStamp}</Typography>
              <Typography>{record.links.length}</Typography>
            </Stack>

            <Stack>
              {record.links.map((link, linkIndex) => (
                <Stack key={linkIndex} direction='row' gap={4}>
                  <Typography>{link.url}</Typography>
                  <Typography>{link.text}</Typography>
                </Stack>
              ))}
            </Stack>
          </Stack>
        ))}
      </Stack>
    </main>
  )
}
