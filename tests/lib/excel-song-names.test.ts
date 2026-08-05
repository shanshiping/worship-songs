import { describe, expect, it } from 'vitest'
import {
  cleanSongName,
  isValidSongName,
  parseSongNames,
} from '@/lib/excel-song-names'

describe('excel-song-names', () => {
  describe('isValidSongName', () => {
    it('rejects work schedule and holiday adjustment labels', () => {
      expect(isValidSongName('补班')).toBe(false)
      expect(isValidSongName('调休')).toBe(false)
      expect(isValidSongName('上班')).toBe(false)
      expect(isValidSongName('改为4')).toBe(false)
      expect(isValidSongName('五一调休')).toBe(false)
      expect(isValidSongName('国庆调休')).toBe(false)
      expect(isValidSongName('五一补班')).toBe(false)
      expect(parseSongNames('奇异恩典+补班')).toEqual(['奇异恩典'])
      expect(parseSongNames('五一调休')).toEqual([])
      expect(parseSongNames('奇异恩典+五一调休')).toEqual(['奇异恩典'])
    })

    it('rejects festival and merge schedule labels', () => {
      expect(isValidSongName('春节')).toBe(false)
      expect(isValidSongName('两堂合并')).toBe(false)
      expect(isValidSongName('三堂合并')).toBe(false)
      expect(isValidSongName('合并主日')).toBe(false)
      expect(isValidSongName('联合崇拜')).toBe(false)
      expect(isValidSongName('元旦')).toBe(false)
      expect(isValidSongName('第二堂')).toBe(false)
    })

    it('accepts real song titles', () => {
      expect(isValidSongName('奇异恩典')).toBe(true)
      expect(isValidSongName('如鹿渴慕溪水')).toBe(true)
      expect(isValidSongName('十架的爱')).toBe(true)
    })

    it('rejects scripture and meeting labels', () => {
      expect(isValidSongName('约翰福音3章16节')).toBe(false)
      expect(isValidSongName('上午聚会')).toBe(false)
      expect(isValidSongName('回应诗歌')).toBe(false)
    })
  })

  describe('parseSongNames', () => {
    it('filters non-song tokens from combined cells', () => {
      expect(parseSongNames('奇异恩典+春节')).toEqual(['奇异恩典'])
      expect(parseSongNames('两堂合并')).toEqual([])
      expect(parseSongNames('如鹿渴慕溪水、十架的爱')).toEqual([
        '如鹿渴慕溪水',
        '十架的爱',
      ])
    })

    it('cleans numbering and parenthetical notes', () => {
      expect(parseSongNames('1. 奇异恩典（副歌）')).toEqual(['奇异恩典'])
    })
  })

  describe('cleanSongName', () => {
    it('strips semicolons and 另外 prefix from song names', () => {
      expect(isValidSongName('另外')).toBe(false)
      expect(cleanSongName('奇异恩典；')).toBe('奇异恩典')
      expect(cleanSongName('；奇异恩典')).toBe('奇异恩典')
      expect(cleanSongName('另外；如鹿渴慕溪水')).toBe('如鹿渴慕溪水')
      expect(parseSongNames('另外；奇异恩典')).toEqual(['奇异恩典'])
      expect(parseSongNames('奇异恩典；补班')).toEqual(['奇异恩典'])
      expect(parseSongNames('另外')).toEqual([])
    })

    it('strips leading indexes and parentheses', () => {
      expect(cleanSongName('  2、十架的爱（慢板）  ')).toBe('十架的爱')
    })
  })
})
