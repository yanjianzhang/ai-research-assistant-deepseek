declare namespace Zotero {
  class Search {
    addCondition(field: string, operator: string, value?: any): void
    search(): Promise<number[]>
  }

  namespace Styles {
    function get(styleId: string): {
      getCiteProc(): {
        updateItems(ids: Array<string | number>): void
        makeBibliography(): [unknown, string[]]
      }
    }
  }

  namespace Item {
    type ItemType = string
  }

  namespace DB {
    function queryAsync<T = any>(sql: string, params?: any[]): Promise<T[]>
  }

  namespace Items {
    function getAsync(id: number): Promise<any>
    function getAsync(ids: number[]): Promise<any[]>
    function getByLibraryAndKeyAsync(libraryID: number, key: string): Promise<any>
  }

  namespace Utilities {
    namespace Internal {
      const Base64: {
        encode(value: string): string
        decode(value: string): string
      }
    }

    const Item: {
      itemToCSLJSON(item: any): any
    }
  }

  namespace Attachments {
    const LINK_MODE_LINKED_FILE: number
    const LINK_MODE_IMPORTED_FILE: number
    const LINK_MODE_IMPORTED_URL: number
    const LINK_MODE_LINKED_URL: number
  }

  namespace URI {
    function getItemURI(item: any): string
  }

  namespace DataDirectory {
    const _dir: string
  }
}
