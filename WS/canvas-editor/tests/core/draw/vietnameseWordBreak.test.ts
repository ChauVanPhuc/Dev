import { describe, it, expect } from 'vitest'
import { LETTER_CLASS } from '@/editor/dataset/constant/Common'
import { mergeOption } from '@/editor/utils/option'
import { Draw } from '@/editor/core/draw/Draw'
import { Listener } from '@/editor/core/listener/Listener'
import { EventBus } from '@/editor/core/event/eventbus/EventBus'
import { Override } from '@/editor/core/override/Override'
import { formatElementList } from '@/editor/utils/element'
import { splitText } from '@/editor/utils'

describe('Vietnamese Word Break & Letter Class', () => {
  it('LETTER_CLASS should include Vietnamese accented characters', () => {
    expect(LETTER_CLASS.VIETNAMESE).toBeDefined()
    expect(LETTER_CLASS.VIETNAMESE).toContain('đ')
    expect(LETTER_CLASS.VIETNAMESE).toContain('Đ')
    expect(LETTER_CLASS.VIETNAMESE).toContain('ố')
    expect(LETTER_CLASS.VIETNAMESE).toContain('ế')
  })

  it('default editor options should include LETTER_CLASS.VIETNAMESE in letterClass', () => {
    const options = mergeOption()
    expect(options.letterClass).toContain(LETTER_CLASS.VIETNAMESE)
  })

  it('measureWord should treat Vietnamese words as whole words', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const options = mergeOption()
    const main = [{ value: '\n' }]
    formatElementList(main, { editorOptions: options, isForceCompensation: true })
    const draw = new Draw(
      container,
      options,
      { header: [{ value: '\n' }], main, footer: [{ value: '\n' }] },
      new Listener(),
      new EventBus(),
      new Override()
    )
    draw.render()

    const textParticle = draw.getTextParticle()
    const nativeCtx = draw.getCtx()

    // Test with Vietnamese text "Ban Giám đốc"
    const text = 'Ban Giám đốc'
    const elementList = splitText(text).map(ch => ({ value: ch }))
    
    // Index 0: 'Ban'
    const word1 = textParticle.measureWord(nativeCtx, elementList, 0)
    expect(word1.endElement?.value).toBe(' ')

    // Index 4: 'Giám'
    const word2 = textParticle.measureWord(nativeCtx, elementList, 4)
    expect(word2.endElement?.value).toBe(' ')

    // Index 9: 'đốc'
    const word3 = textParticle.measureWord(nativeCtx, elementList, 9)
    // Should measure to the end of the word 'đốc' without prematurely stopping on 'đ' or 'ố'
    expect(word3.endElement).toBeNull()

    container.remove()
  })
})
