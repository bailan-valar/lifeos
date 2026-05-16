import type { Ref } from 'vue'
import type { CategoryTreeNode, BillCategory, CategoryType } from '~/types/bill'

export interface CategoryMenuState {
  visible: boolean
  x: number
  y: number
  node: CategoryTreeNode | null
}

export interface UseBillingCategoryMenuOptions {
  categoryMenu: Ref<CategoryMenuState>
  openCategoryDialog: (category?: BillCategory, defaultType?: CategoryType) => void
  handleDeleteCategory: (id: string) => Promise<void>
}

export function useBillingCategoryMenu(options: UseBillingCategoryMenuOptions) {
  function openCategoryContextMenu(payload: { node: CategoryTreeNode; x: number; y: number }) {
    const margin = 6
    const menuWidth = 180
    const menuHeight = 132
    const maxX = window.innerWidth - menuWidth - margin
    const maxY = window.innerHeight - menuHeight - margin
    options.categoryMenu.value = {
      visible: true,
      x: Math.min(payload.x, maxX),
      y: Math.min(payload.y, maxY),
      node: payload.node
    }
  }

  function closeCategoryMenu() {
    if (!options.categoryMenu.value.visible) return
    options.categoryMenu.value = { visible: false, x: 0, y: 0, node: null }
  }

  function openAddChildCategoryDialog(parent: CategoryTreeNode) {
    options.openCategoryDialog(undefined, parent.type)
  }

  function onMenuAddChild() {
    if (options.categoryMenu.value.node) {
      openAddChildCategoryDialog(options.categoryMenu.value.node)
    }
    closeCategoryMenu()
  }

  function onMenuEdit() {
    if (options.categoryMenu.value.node) {
      options.openCategoryDialog(options.categoryMenu.value.node)
    }
    closeCategoryMenu()
  }

  async function onMenuDelete() {
    const node = options.categoryMenu.value.node
    closeCategoryMenu()
    if (node) {
      await options.handleDeleteCategory(node.id)
    }
  }

  return {
    openCategoryContextMenu,
    closeCategoryMenu,
    openAddChildCategoryDialog,
    onMenuAddChild,
    onMenuEdit,
    onMenuDelete
  }
}
