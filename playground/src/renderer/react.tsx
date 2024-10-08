/* eslint-disable no-console */
import React from 'react'
import type { Root } from 'react-dom/client'
import ReactDOM from 'react-dom/client'
import { shallowReactive, watch } from 'vue'
import { interpolate, interpolateColors } from 'remotion'
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
            onAnimationStart: (elements, maxContainerDimensions) => {
              if (elements.length === 0) {
                return
              }

              const container = document.querySelector('.shiki-magic-move-container') as HTMLPreElement

              for (let frame = 0; frame <= animationFrames; frame++) {
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')
                canvas.width = maxContainerDimensions?.width || 100
                canvas.height = maxContainerDimensions?.height || 100
                ctx!.fillStyle = container.style.backgroundColor
                ctx?.fillRect(0, 0, canvas.width, canvas.height)

                elements.forEach((el) => {
                  const x = interpolate(frame, [0, animationFrames], [el.x.start, el.x.end])
                  const y = interpolate(frame, [0, animationFrames], [el.y.start, el.y.end])
                  const opacity = interpolate(frame, [0, animationFrames], [el.opacity.start, el.opacity.end])
                  const color = interpolateColors(frame, [0, animationFrames], [el.color.start || 'rgba(0,0,0,0)', el.color.end || 'rgba(0,0,0,0)'])

                  const elRect = el.el.getBoundingClientRect()

                  const chunkStyles = `font-family: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace; color: ${color}; opacity: ${opacity};`

                  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${elRect.width}" height="${elRect.height}">
                    <foreignObject width="100%" height="100%">
                      <div xmlns="http://www.w3.org/1999/xhtml" style="${chunkStyles}">${el.el.innerHTML}</div>
                    </foreignObject>
                  </svg>`

                  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
                  const svgObjectUrl = URL.createObjectURL(svgBlob)

                  const tempImg = new Image()
                  tempImg.style.margin = '0'
                  tempImg.style.padding = '0'
                  tempImg.addEventListener('load', () => {
                    ctx!.drawImage(tempImg, x, y)
                    URL.revokeObjectURL(svgObjectUrl)
                  })

                  tempImg.src = svgObjectUrl
                })
                setTimeout(() => {
                  document.body.appendChild(canvas)
                }, 1000)
              }
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
