// deno-lint-ignore-file

const cardList = document.querySelector('.js-card-stack')

export class CardView {
  constructor(movieData, eventTarget) {
    this.movieData = movieData
    this.eventTarget = eventTarget
    this.animationDuration = 500
    this.basePath = document.body.dataset.basePath
    this.render()
  }

  render() {
    const node = document.createElement('div')
    this.node = node
    node.classList.add('card')
    node.addEventListener('pointerdown', this.handleSwipe)
    node.addEventListener('touchstart', e => e.preventDefault())
    node.addEventListener('rate', e =>
      this.rate(e.data, this.getAnimation(e.data ? 'right' : 'left'))
    )

    const { title, type, art, year, guid, rating, summary, director } = this.movieData
    node.dataset.guid = guid

    const srcSet = [
      `${this.basePath}${art}?w=300`,
      `${this.basePath}${art}?w=450 1.5x`,
      `${this.basePath}${art}?w=600 2x`,
      `${this.basePath}${art}?w=900 3x`,
    ]

    node.innerHTML = `
      <img class="poster" src="${srcSet[0]
      }" decode="async" srcset="${srcSet.join(', ')}" alt="${title} poster" />
      <p>${title}${type === 'movie' ? ` (${year})` : ''} <br> Rotten Tomatoes: ${rating} <br>Director: ${director}<br><br> Summary: ${summary}</p>
    `
    cardList.appendChild(node)
  }

  async rate(wantsToWatch, animation) {
    this.eventTarget.dispatchEvent(new Event('newTopCard'))

    if (animation.playState !== 'finished') {
      if (animation.currentTime === this.animationDuration) {
        animation.finish()
      } else {
        animation.playbackRate = 3
        animation.play()
      }
      await animation.finished
    }

    this.eventTarget.dispatchEvent(
      new MessageEvent('response', {
        data: {
          guid: this.movieData.guid,
          wantsToWatch,
        },
      })
    )
    this.destroy()
  }

  handleSwipe = startEvent => {
    if (
      (startEvent.pointerType === 'mouse' && startEvent.button !== 0) ||
      startEvent.target instanceof HTMLButtonElement
    ) {
      return
    }

    startEvent.preventDefault()
    this.node.setPointerCapture(startEvent.pointerId)
    const maxX = window.innerWidth

    let currentDirection
    let position = 0
    this.animationFrameRequestId = requestAnimationFrame(() =>
      this.animationLoop()
    )

    const handleMove = e => {
      const direction = e.x < startEvent.x ? 'left' : 'right'
      const delta = e.x - startEvent.x

      position =
        direction === 'left'
          ? Math.abs(delta) / startEvent.x
          : delta / (maxX - startEvent.x)

      if (currentDirection != direction) {
        currentDirection = direction
        // if (this.animation) {
        //   this.animation.finish()
        // }
        this.animation = this.getAnimation(direction)

        this.animation.pause()
      }

      this.currentTime =
        Math.max(0, Math.min(1, position)) * this.animationDuration
    }
    this.node.addEventListener('pointermove', handleMove, { passive: true })
    this.node.addEventListener(
      'lostpointercapture',
      async () => {
        this.node.removeEventListener('pointermove', handleMove)
        cancelAnimationFrame(this.animationFrameRequestId)
        if (this.animation) {
          if (position >= 0.5) {
            await this.rate(currentDirection === 'right', this.animation)
          } else {
            this.animation.reverse()
          }

          this.animation = null
          currentDirection = null
        }
      },
      { once: true }
    )
  }

  animationLoop() {
    if (this.animation) {
      this.animation.currentTime = this.currentTime
    }
    this.animationFrameRequestId = requestAnimationFrame(() =>
      this.animationLoop()
    )
  }

  getAnimation(direction) {
    return this.node.animate(
      {
        transform: [
          'translate(0, 0)',
          `translate(${direction === 'left' ? '-50vw' : '50vw'}, 0)`,
        ],
        opacity: ['1', '0.8', '0'],
      },
      {
        duration: this.animationDuration,
        easing: 'ease-in-out',
        fill: 'both',
      }
    )
  }

  destroy() {
    this.node.remove()
  }
}
