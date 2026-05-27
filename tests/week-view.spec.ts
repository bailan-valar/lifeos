import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import WeekView from '~/components/time/WeekView.vue'

describe('WeekView', () => {
  let wrapper: any
  let pinia: any

  beforeEach(() => {
    pinia = createPinia()
    // 模拟浏览器环境
    global.window = {
      location: { href: '' },
      localStorage: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn()
      }
    } as any
  })

  it('应该正确渲染周视图', () => {
    const weekStart = new Date('2024-01-01') // 周一
    
    wrapper = mount(WeekView, {
      props: {
        weekStart
      },
      global: {
        plugins: [pinia]
      }
    })

    expect(wrapper.find('.week-view').exists()).toBe(true)
    expect(wrapper.find('.week-header').exists()).toBe(true)
    expect(wrapper.find('.week-grid').exists()).toBe(true)
  })

  it('应该显示7天的列', () => {
    const weekStart = new Date('2024-01-01')
    
    wrapper = mount(WeekView, {
      props: {
        weekStart
      },
      global: {
        plugins: [pinia]
      }
    })

    const dayColumns = wrapper.findAll('.day-column')
    expect(dayColumns.length).toBe(7)
  })

  it('应该正确计算周范围', async () => {
    const weekStart = new Date('2024-01-01')
    
    wrapper = mount(WeekView, {
      props: {
        weekStart
      },
      global: {
        plugins: [pinia]
      }
    })

    await wrapper.vm.$nextTick()
    
    // 检查周标题和范围
    expect(wrapper.vm.weekTitle).toContain('1月')
    expect(wrapper.vm.weekRange).toContain('1月1日')
    expect(wrapper.vm.weekRange).toContain('1月7日')
  })
})
