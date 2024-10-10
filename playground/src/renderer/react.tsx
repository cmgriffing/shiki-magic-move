/* eslint-disable no-console */
import React from 'react'
import type { Root } from 'react-dom/client'
import ReactDOM from 'react-dom/client'
import { shallowReactive, watch } from 'vue'
import { interpolate, interpolateColors } from 'remotion'
import { encode } from 'modern-gif'
import workerUrl from 'modern-gif/worker?url'
import { ShikiMagicMove } from '../../../src/react'
import type { RendererFactory, RendererFactoryResult } from './types'

const animationSeconds = 1
const animationFPS = 3
const animationFrames = animationSeconds * animationFPS

export const createRendererReact: RendererFactory = (options): RendererFactoryResult => {
  let app: Root | undefined

  const props = shallowReactive<any>({
    onStart: options.onStart,
    onEnd: options.onEnd,
  })

  function App() {
    // TODO: make React not render twice
    const [count, setCounter] = React.useState(0)

    React.useEffect(() => {
      watch(props, () => {
        // Force React to re-render
        setCounter(c => c + 1)
      })
    }, [])

    console.log('React rendering', count)

    return (
      <>
        <ShikiMagicMove
          {...props}
          options={{
            onAnimationStart: async (elements, maxContainerDimensions) => {
              if (elements.length === 0) {
                return
              }

              const container = document.querySelector('.shiki-magic-move-container') as HTMLPreElement

              const canvasFrames: HTMLCanvasElement[] = []

              for (let frame = 0; frame <= animationFrames; frame++) {
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d', { alpha: false })
                canvas.width = maxContainerDimensions?.width || 100
                canvas.height = maxContainerDimensions?.height || 100
                ctx!.fillStyle = container.style.backgroundColor
                ctx?.fillRect(0, 0, canvas.width, canvas.height)

                const elementPromises = elements.map(async (el) => {
                  if (el.el.textContent === 'const') {
                    console.log(el)
                  }

                  const x = interpolate(frame, [0, animationFrames], [el.x.start, el.x.end])
                  const y = interpolate(frame, [0, animationFrames], [el.y.start, el.y.end])
                  const opacity = interpolate(frame, [0, animationFrames], [el.opacity.start, el.opacity.end])
                  const color = interpolateColors(frame, [0, animationFrames], [el.color.start || 'rgba(0,0,0,0)', el.color.end || 'rgba(0,0,0,0)'])

                  const computedStyle = window.getComputedStyle(el.el)
                  const fontFamily = computedStyle.getPropertyValue('font-family').replaceAll('"', '\'')
                  const fontSize = computedStyle.getPropertyValue('font-size')

                  ctx!.font = `${fontSize} ${fontFamily}`
                  ctx!.fillStyle = color
                  ctx!.globalAlpha = opacity
                  ctx!.fillText(htmlDecode(el.el.innerHTML), x, y)
                })
                await Promise.all(elementPromises)

                document.body.appendChild(canvas)

                canvasFrames.push(canvas)
              }

              const gif = await encode({
                workerUrl,
                width: canvasFrames[0].width,
                height: canvasFrames[0].height,
                frames: canvasFrames.map((canvas) => {
                  // const frame = new Frame(canvas)
                  const ctx = canvas.getContext('2d')
                  return {
                    data: ctx!.getImageData(0, 0, canvas.width, canvas.height),
                    delay: 1000 / animationFPS,
                  }
                }),
              })

              const blob = new Blob([gif], { type: 'image/gif' })
              // window.open(URL.createObjectURL(blob))

              const dataUrl = await blobToDataURL(blob)
              console.log(dataUrl)
              const finalGif = document.createElement('img')
              finalGif.src = dataUrl?.toString() || ''

              document.body.appendChild(finalGif)
            },
          }}
          className={props.class}
        />

      </>
    )
  }

  return {
    mount: (element, payload) => {
      Object.assign(props, payload)
      app = ReactDOM.createRoot(element)
      app.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      )

      console.log('React renderer mounted')
    },

    update: (payload) => {
      console.log('React update', payload)
      Object.assign(props, payload)
    },

    dispose: () => {
      app?.unmount()
      app = undefined
    },
  }
}

function blobToDataURL(blob: Blob): Promise<string | ArrayBuffer | null | undefined> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = function (e) {
      resolve(e.target?.result)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function htmlDecode(str: string) {
  const txt = document.createElement('textarea')
  txt.innerHTML = str
  return txt.value
}
