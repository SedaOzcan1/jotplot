import { describe, expect, it } from 'vitest'
import {
  AUDIO_MAX_BYTES,
  audioContentType,
  audioExtension,
  audioFileError,
  formatDuration,
  formatFileSize,
  pickRecorderType,
  recordingPath,
  storageErrorCode,
} from '../../app/utils/audio'

describe('audioExtension', () => {
  it.each([
    [{ type: 'audio/webm;codecs=opus' }, 'webm'],
    [{ type: 'audio/mpeg', name: 'kayit.mp3' }, 'mp3'],
    [{ type: 'audio/x-m4a', name: 'Toplantı.m4a' }, 'm4a'],
    [{ type: 'audio/mp4' }, 'm4a'],
    [{ type: '', name: 'Ders kaydı.M4A' }, 'm4a'],
    [{ type: 'application/octet-stream', name: 'ses.wav' }, 'wav'],
  ])('reads %o as %s', (file, extension) => {
    expect(audioExtension(file)).toBe(extension)
  })

  it('rejects files that are not audio', () => {
    expect(audioExtension({ type: 'text/plain', name: 'not.txt' })).toBeNull()
    expect(audioExtension({ type: 'video/quicktime', name: 'video.mov' })).toBeNull()
  })
})

describe('audioContentType', () => {
  it('sends audio types without parameters and fills in a missing type', () => {
    expect(audioContentType({ type: 'audio/webm;codecs=opus' }, 'webm')).toBe('audio/webm')
    expect(audioContentType({ type: '' }, 'm4a')).toBe('audio/mp4')
    expect(audioContentType({ type: 'application/octet-stream' }, 'mp3')).toBe('audio/mpeg')
    expect(audioContentType({ type: '' }, 'flac')).toBe('audio/flac')
  })
})

describe('audioFileError', () => {
  it('accepts an audio file within the limit', () => {
    expect(audioFileError({ type: 'audio/mpeg', name: 'a.mp3', size: AUDIO_MAX_BYTES })).toBeNull()
  })

  it('explains what is wrong in Turkish', () => {
    expect(audioFileError({ type: 'text/plain', name: 'a.txt', size: 10 })).toContain(
      'desteklenmiyor',
    )
    expect(audioFileError({ type: 'audio/mpeg', name: 'a.mp3', size: 0 })).toContain('boş')
    expect(audioFileError({ type: 'audio/mpeg', name: 'a.mp3', size: AUDIO_MAX_BYTES + 1 })).toBe(
      'Dosya çok büyük (25 MB). En fazla 25 MB yükleyebilirsin.',
    )
  })
})

describe('pickRecorderType', () => {
  it('prefers Opus in WebM and falls back to MP4 for Safari', () => {
    expect(pickRecorderType(() => true)).toBe('audio/webm;codecs=opus')
    expect(pickRecorderType((type) => type === 'audio/mp4')).toBe('audio/mp4')
    expect(pickRecorderType(() => false)).toBeNull()
  })
})

describe('formatting', () => {
  it.each([
    [0, '0:00'],
    [7.9, '0:07'],
    [754, '12:34'],
    [3723, '1:02:03'],
  ])('formats %d seconds as %s', (seconds, text) => {
    expect(formatDuration(seconds)).toBe(text)
  })

  it('formats file sizes the Turkish way', () => {
    expect(formatFileSize(300)).toBe('1 KB')
    expect(formatFileSize(820 * 1024)).toBe('820 KB')
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1,5 MB')
    expect(formatFileSize(AUDIO_MAX_BYTES)).toBe('25 MB')
  })
})

describe('recordingPath', () => {
  it('stores the file in the user folder under the note id, as the database requires', () => {
    expect(recordingPath('user-1', 'note-1', 'webm')).toBe('user-1/note-1.webm')
  })
})

describe('storageErrorCode', () => {
  it('reads the real code from a Storage error body', () => {
    expect(storageErrorCode({ status: 200, body: '{"Key":"recordings/a"}' })).toBeNull()
    expect(
      storageErrorCode({
        status: 400,
        body: '{"statusCode":"409","error":"Duplicate","message":"The resource already exists"}',
      }),
    ).toBe('409')
    expect(
      storageErrorCode({ status: 400, body: '{"statusCode":"413","error":"Payload too large"}' }),
    ).toBe('413')
  })

  it('falls back to the HTTP status when the body is not JSON', () => {
    expect(storageErrorCode({ status: 502, body: '<html>Bad gateway</html>' })).toBe('502')
  })
})
