// Character to Organization mapping
export const CHARACTER_ORGANIZATIONS: Record<string, string> = {
  "橘光": "海兰德铁道学园",
  "橘望": "海兰德铁道学园",
  "旁白": "",
  "阿罗娜": "夏莱"
}

// Get organization name by character name
export function getOrganizationByCharacter(characterName: string): string {
  return CHARACTER_ORGANIZATIONS[characterName] || ""
}