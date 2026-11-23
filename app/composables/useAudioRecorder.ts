export type RecorderState = 'idle' | 'starting' | 'recording' | 'paused' | 'stopped'

/** Opus speech at this rate is about 15 MB per hour, so 25 MB is well over an hour and a half. */
const BITS_PER_SECOND = 32_000
/** Stop a little before the upload limit so the file always fits. */
const STOP_AT_BYTES = AUDIO_MAX_BYTES * 0.97

const START_ERRORS: Record<string, string> = {
  NotAllowedError:
    'Mikrofon izni verilmedi. Tarayıcının adres çubuğundaki ayarlardan mikrofona izin verip tekrar dene.',
  NotFoundError: 'Mikrofon bulunamadı. Bir mikrofon bağlayıp tekrar dene.',
  NotReadableError:
    'Mikrofon başka bir uygulama tarafından kullanılıyor olabilir. Onu kapatıp tekrar dene.',
}
const UNSUPPORTED =
  'Bu tarayıcı ses kaydını desteklemiyor. Telefonunun ses kaydedicisiyle kaydedip "Dosya yükle" ile ekleyebilirsin.'

/**
 * Records audio in the browser with MediaRecorder (T2.2, US-2.1). While recording, a Screen Wake
 * Lock keeps the phone screen on so the recording is not cut off; it is requested again when the
 * user comes back to the tab. The recording is kept in memory until it is saved.
 */
export function useAudioRecorder() {
  const state = ref<RecorderState>('idle')
  const elapsedSeconds = ref(0)
  const recording = shallowRef<Blob | null>(null)
  const error = ref<string | null>(null)
  /** Set when the recording stopped on its own: size limit or lost microphone. */
  const notice = ref<string | null>(null)
  /** False when the browser cannot keep the screen on; the page then warns the user. */
  const wakeLockActive = ref(false)

  let recorder: MediaRecorder | null = null
  let stream: MediaStream | null = null
  let chunks: Blob[] = []
  let bytes = 0
  let wakeLock: WakeLockSentinel | null = null
  let timer: ReturnType<typeof setInterval> | undefined
  /** Time recorded before the current stretch, and when the current stretch started. */
  let recordedMs = 0
  let stretchStartedAt = 0

  function tick() {
    elapsedSeconds.value = (recordedMs + (Date.now() - stretchStartedAt)) / 1000
  }

  async function keepScreenOn() {
    if (!('wakeLock' in navigator)) return
    try {
      wakeLock = await navigator.wakeLock.request('screen')
      wakeLockActive.value = true
      wakeLock.addEventListener('release', () => {
        wakeLockActive.value = false
      })
    } catch {
      // Refused, for example in battery saver mode; the page shows a warning instead.
      wakeLockActive.value = false
    }
  }

  async function releaseScreen() {
    const lock = wakeLock
    wakeLock = null
    wakeLockActive.value = false
    await lock?.release().catch(() => {})
  }

  // The browser drops the wake lock when the tab is hidden; take it again on return.
  function onVisibilityChange() {
    if (document.visibilityState === 'visible' && state.value === 'recording' && !wakeLock) {
      void keepScreenOn()
    }
  }

  function stopTracks() {
    stream?.getTracks().forEach((track) => track.stop())
    stream = null
  }

  async function start() {
    if (state.value !== 'idle' && state.value !== 'stopped') return
    error.value = null
    notice.value = null
    const type =
      typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia
        ? null
        : pickRecorderType((candidate) => MediaRecorder.isTypeSupported(candidate))
    if (!type) {
      error.value = UNSUPPORTED
      return
    }

    state.value = 'starting'
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
    } catch (err) {
      state.value = recording.value ? 'stopped' : 'idle'
      error.value =
        START_ERRORS[(err as DOMException)?.name] ??
        'Mikrofon açılamadı. Sayfayı yenileyip tekrar dene.'
      return
    }

    chunks = []
    bytes = 0
    recording.value = null
    recorder = new MediaRecorder(stream, { mimeType: type, audioBitsPerSecond: BITS_PER_SECOND })
    recorder.addEventListener('dataavailable', (event) => {
      if (!event.data.size) return
      chunks.push(event.data)
      bytes += event.data.size
      if (bytes >= STOP_AT_BYTES && state.value === 'recording') {
        notice.value = 'Kayıt 25 MB sınırına ulaştığı için durduruldu. Kaydı şimdi kaydedebilirsin.'
        stop()
      }
    })
    recorder.addEventListener('stop', () => {
      recording.value = new Blob(chunks, { type: baseMimeType(recorder?.mimeType || type) })
      chunks = []
      stopTracks()
      state.value = 'stopped'
    })
    // The microphone can disappear mid-recording (unplugged, taken by a phone call).
    stream.getAudioTracks()[0]?.addEventListener('ended', () => {
      if (state.value === 'recording' || state.value === 'paused') {
        notice.value = 'Mikrofon bağlantısı kesildi. O ana kadarki kayıt korunuyor.'
        stop()
      }
    })

    // Data every second, so a sudden stop loses at most a second.
    recorder.start(1000)
    recordedMs = 0
    stretchStartedAt = Date.now()
    elapsedSeconds.value = 0
    timer = setInterval(tick, 250)
    state.value = 'recording'
    document.addEventListener('visibilitychange', onVisibilityChange)
    await keepScreenOn()
  }

  function pause() {
    if (state.value !== 'recording' || !recorder) return
    recorder.pause()
    recordedMs += Date.now() - stretchStartedAt
    clearInterval(timer)
    elapsedSeconds.value = recordedMs / 1000
    state.value = 'paused'
  }

  function resume() {
    if (state.value !== 'paused' || !recorder) return
    recorder.resume()
    stretchStartedAt = Date.now()
    timer = setInterval(tick, 250)
    state.value = 'recording'
  }

  function stop() {
    if ((state.value !== 'recording' && state.value !== 'paused') || !recorder) return
    if (state.value === 'recording') recordedMs += Date.now() - stretchStartedAt
    clearInterval(timer)
    elapsedSeconds.value = recordedMs / 1000
    document.removeEventListener('visibilitychange', onVisibilityChange)
    void releaseScreen()
    recorder.stop()
  }

  /** Throws the recording away so a new one can start. */
  function discard() {
    if (state.value === 'recording' || state.value === 'paused') return
    recording.value = null
    elapsedSeconds.value = 0
    notice.value = null
    state.value = 'idle'
  }

  onBeforeUnmount(() => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    stopTracks()
    void releaseScreen()
  })

  return {
    state: readonly(state),
    elapsedSeconds: readonly(elapsedSeconds),
    recording: readonly(recording),
    error: readonly(error),
    notice: readonly(notice),
    wakeLockActive: readonly(wakeLockActive),
    start,
    pause,
    resume,
    stop,
    discard,
  }
}
