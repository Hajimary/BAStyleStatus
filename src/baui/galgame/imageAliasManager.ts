// 图片别名管理单例
class ImageAliasManager {
  private aliases: Record<string, string> = {}
  private aliasesLoaded = false
  private loadingPromise: Promise<void> | null = null

  async loadImageAliases(): Promise<void> {
    if (this.aliasesLoaded) return
    if (this.loadingPromise) return this.loadingPromise

    this.loadingPromise = this.doLoadImageAliases()
    await this.loadingPromise
    this.loadingPromise = null
  }

  private async doLoadImageAliases(): Promise<void> {
    try {
      // Check if getCurrentCharPrimaryLorebook exists
      if (typeof (window as any).getCurrentCharPrimaryLorebook !== 'function') {
        this.initDefaultAliases()
        this.aliasesLoaded = true
        return
      }

      const charLorebookName = await (window as any).getCurrentCharPrimaryLorebook()
      if (!charLorebookName) {
        this.initDefaultAliases()
        this.aliasesLoaded = true
        return
      }

      const allEntries = await (window as any).getLorebookEntries(charLorebookName)
      this.aliases = {}

      const imageTypeRegex = /^图片-/
      const imageEntries = allEntries.filter(
        (entry: any) => entry.comment && imageTypeRegex.test(entry.comment) && entry.enabled === true
      )

      if (imageEntries.length === 0) {
        this.initDefaultAliases()
        this.aliasesLoaded = true
        return
      }

      // Process image entries
      for (const entry of imageEntries) {
        const imageType = entry.comment.replace('图片-', '')
        const imageUrls = entry.content.split('\n').filter((url: string) => url.trim())

        if (imageUrls.length > 0) {
          this.aliases[imageType] = imageUrls[0].trim()
        }
      }

      this.aliasesLoaded = true
    } catch (error) {
      console.error('Failed to load image aliases:', error)
      this.initDefaultAliases()
      this.aliasesLoaded = true
    }
  }

  private initDefaultAliases(): void {
    // Initialize with default aliases if needed
    this.aliases = {
      "望闭眼": "https://files.catbox.moe/mo8b6l.png",
      "望闭眼得意": "https://files.catbox.moe/o2a85y.png",
      "望大笑": "https://files.catbox.moe/sr8cjd.png",
      "望害羞A": "https://files.catbox.moe/8b2sn5.png",
      "望害羞B": "https://files.catbox.moe/5less4.png",
      "望慌张A": "https://files.catbox.moe/6a473v.png",
      "望慌张B": "https://files.catbox.moe/6ijzv5.png",
      "望奸笑A": "https://files.catbox.moe/3wa9m6.png",
      "望奸笑B": "https://files.catbox.moe/dcxzcv.png",
      "望生气": "https://files.catbox.moe/0t2yiy.png",
      "望叹气": "https://files.catbox.moe/bx5n8q.png",
      "望嫌弃": "https://files.catbox.moe/g73r4l.png",
      "望啧嘴": "https://files.catbox.moe/1n9dyr.png",
      "望正常A": "https://files.catbox.moe/np7lc2.png",
      "望正常B": "https://files.catbox.moe/5y6qcy.png",
      "望正常C": "https://files.catbox.moe/0nqp7l.png",
      "光闭眼": "https://files.catbox.moe/xsqyci.png",
      "光不满": "https://files.catbox.moe/qtejnq.png",
      "光翻白眼": "https://files.catbox.moe/yjjpgx.png",
      "光害羞": "https://files.catbox.moe/3mzpzq.png",
      "光认真": "https://files.catbox.moe/otfw0h.png",
      "光生气A": "https://files.catbox.moe/0wmzqh.png",
      "光生气B": "https://files.catbox.moe/l88ykq.png",
      "光思考": "https://files.catbox.moe/5a1ek6.png",
      "光叹气": "https://files.catbox.moe/ynj6v9.png",
      "光微笑": "https://files.catbox.moe/iqjjko.png",
      "光疑问": "https://files.catbox.moe/j0s91u.png",
      "光正常A": "https://files.catbox.moe/3do99a.png",
      "光正常B": "https://files.catbox.moe/1l5tj9.png",
      "车站内部": "https://files.catbox.moe/frmpk7.jpg",
      "荒野铁轨晚": "https://files.catbox.moe/kb7ajw.jpg",
      "荒野铁轨早": "https://files.catbox.moe/1g1ycr.jpg",
      "列车餐车内": "https://files.catbox.moe/28idmr.jpg",
      "列车车厢内": "https://files.catbox.moe/x4kde4.jpg",
      "列车维修车间晚": "https://files.catbox.moe/fnqbg0.jpg",
      "列车维修车间早": "https://files.catbox.moe/0xdk16.jpg",
      "沙漠白天": "https://files.catbox.moe/tvw75f.jpg",
      "铁路车站白天": "https://files.catbox.moe/0qxx8n.jpg",
      "铁路车站夜晚": "https://files.catbox.moe/8anfct.jpg",
      "便利店内": "https://files.catbox.moe/spcapo.jpg",
      "便利店前": "https://files.catbox.moe/52mr4u.jpg",
      "仓库": "https://files.catbox.moe/644z0i.jpg",
      "公园白天": "https://files.catbox.moe/fc37eb.jpg",
      "街道夜晚": "https://files.catbox.moe/j6u4li.jpg",
      "路边": "https://files.catbox.moe/8qpfw4.jpg",
      "路口": "https://files.catbox.moe/wx0krw.jpg",
      "马路白天A": "https://files.catbox.moe/sjd1zj.jpg",
      "马路白天B": "https://files.catbox.moe/vc21ac.jpg",
      "森林": "https://files.catbox.moe/wcqgtd.jpg",
      "商场": "https://files.catbox.moe/kjr7iw.jpg",
      "卧室白天": "https://files.catbox.moe/e9foz7.jpg",
      "卧室晚上": "https://files.catbox.moe/uoc7sr.jpg",
      "夏莱办公室": "https://files.catbox.moe/1wjq3i.jpg",
      "夏莱休息室": "https://files.catbox.moe/d2ise0.jpg",
      "校园内": "https://files.catbox.moe/99a95l.jpg",
      "医院": "https://files.catbox.moe/54dw4t.jpg",
      "游泳池": "https://files.catbox.moe/6j9q3x.jpg",
      "虚拟空间": "https://files.catbox.moe/kynn7u.jpg",
      "杂志": "https://files.catbox.moe/zr5cuk.png",
      "sense的平板": "https://files.catbox.moe/xupwpw.jpg",
      "咖喱饭": "https://files.catbox.moe/ztxamb.png",
      "兔子": "https://files.catbox.moe/8kkeh4.jpg",
      "运动上衣": "https://files.catbox.moe/2rl7yn.png",
      "回忆A": "https://files.catbox.moe/aj8bux.png",
      "回忆B": "https://files.catbox.moe/lhur60.jpg",
      "回忆C": "https://files.catbox.moe/txi2mz.jpg",
      "回忆D": "https://files.catbox.moe/ralafd.jpg",
      "回忆E": "https://files.catbox.moe/ynzpny.jpg",
      "阿罗娜默认": "https://files.catbox.moe/7e6hzd.png"
    }
  }

  async waitForAliasesLoaded(): Promise<void> {
    if (this.aliasesLoaded) return
    if (this.loadingPromise) {
      await this.loadingPromise
      return
    }
    await this.loadImageAliases()
  }

  getAliases(): Record<string, string> {
    return { ...this.aliases }
  }

  resolveImageUrl(urlOrAlias: string): string {
    // Check if it's an alias reference
    const aliasMatch = urlOrAlias.match(/^@(.+)$/)
    if (aliasMatch) {
      const alias = aliasMatch[1].trim()
      if (alias in this.aliases) {
        return this.aliases[alias]
      }
      return '' // Alias not found
    }

    // Check if urlOrAlias is a known alias
    if (urlOrAlias in this.aliases) {
      return this.aliases[urlOrAlias]
    }

    // Check if it's already a valid URL
    if (urlOrAlias.startsWith('http://') || urlOrAlias.startsWith('https://')) {
      return urlOrAlias
    }

    // Not a valid URL or alias
    return ''
  }

  setAlias(key: string, url: string): void {
    this.aliases[key] = url
  }

  clearAliases(): void {
    this.aliases = {}
    this.aliasesLoaded = false
  }
}

// Export singleton instance
export const imageAliasManager = new ImageAliasManager()

// Export helper function for resolving URLs
export async function resolveImageUrl(urlOrAlias: string): Promise<string> {
  await imageAliasManager.waitForAliasesLoaded()
  return imageAliasManager.resolveImageUrl(urlOrAlias)
}
