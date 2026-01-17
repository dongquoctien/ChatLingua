import { StudyUnit, StudyPageExercise } from '@chatlingua/shared';

/**
 * Sample study data for Unit 0 - Welcome to English!
 * Based on Prepare 2nd Edition Level 1 Student's Book
 */
export const SAMPLE_UNIT0_DATA: StudyUnit = {
  unitId: 'prepare-2e-l1-unit-0',
  unitNumber: 0,
  title: 'Welcome to English!',
  cefrLevel: 'A1',
  pages: [
    // Page 1: Vocabulary - The alphabet
    {
      pageId: 'page-0-1',
      pageNumber: 1,
      layout: 'two-column',
      sections: [
        // Left column: Vocabulary section
        {
          sectionId: 'vocab-alphabet',
          type: 'vocabulary-section',
          header: {
            title: 'VOCABULARY',
            subtitle: 'The alphabet',
            color: 'teal'
          },
          exercises: [
            {
              exerciseId: 'ex-alphabet-1',
              number: 1,
              type: 'listen-repeat',
              instruction: 'Listen and repeat.',
              audio: {
                trackNumber: '01',
                fileName: 'track01-alphabet.mp3',
                baseUrl: '/audio/word-maps/prepare-2e-l1/sb/'
              },
              content: {
                type: 'alphabet-grid',
                columns: 7,
                items: [
                  { letter: 'A a', phonetic: '/eɪ/' },
                  { letter: 'B b', phonetic: '/biː/' },
                  { letter: 'C c', phonetic: '/siː/' },
                  { letter: 'D d', phonetic: '/diː/' },
                  { letter: 'E e', phonetic: '/iː/' },
                  { letter: 'F f', phonetic: '/ef/' },
                  { letter: 'G g', phonetic: '/dʒiː/' },
                  { letter: 'H h', phonetic: '/eɪtʃ/' },
                  { letter: 'I i', phonetic: '/aɪ/' },
                  { letter: 'J j', phonetic: '/dʒeɪ/' },
                  { letter: 'K k', phonetic: '/keɪ/' },
                  { letter: 'L l', phonetic: '/el/' },
                  { letter: 'M m', phonetic: '/em/' },
                  { letter: 'N n', phonetic: '/en/' },
                  { letter: 'O o', phonetic: '/əʊ/' },
                  { letter: 'P p', phonetic: '/piː/' },
                  { letter: 'Q q', phonetic: '/kjuː/' },
                  { letter: 'R r', phonetic: '/ɑː/' },
                  { letter: 'S s', phonetic: '/es/' },
                  { letter: 'T t', phonetic: '/tiː/' },
                  { letter: 'U u', phonetic: '/juː/' },
                  { letter: 'V v', phonetic: '/viː/' },
                  { letter: 'W w', phonetic: '/ˈdʌbljuː/' },
                  { letter: 'X x', phonetic: '/eks/' },
                  { letter: 'Y y', phonetic: '/waɪ/' },
                  { letter: 'Z z', phonetic: '/zed/' }
                ]
              }
            },
            {
              exerciseId: 'ex-alphabet-2',
              number: 2,
              type: 'listen-write',
              instruction: 'Listen. Write the letters you hear.',
              audio: {
                trackNumber: '02',
                fileName: 'track02-letters.mp3',
                baseUrl: '/audio/word-maps/prepare-2e-l1/sb/'
              },
              interactive: {
                type: 'fill-blanks',
                data: {
                  type: 'fill-blanks',
                  sentences: [
                    { text: '1. ___, ___, ___', blanks: [{ position: 0, answer: 'A' }, { position: 1, answer: 'B' }, { position: 2, answer: 'C' }] },
                    { text: '2. ___, ___, ___', blanks: [{ position: 0, answer: 'L' }, { position: 1, answer: 'M' }, { position: 2, answer: 'N' }] },
                    { text: '3. ___, ___, ___', blanks: [{ position: 0, answer: 'X' }, { position: 1, answer: 'Y' }, { position: 2, answer: 'Z' }] }
                  ]
                }
              },
              content: {
                type: 'text',
                text: 'Write the letters you hear in the spaces.'
              }
            }
          ]
        },
        // Right column: Numbers section
        {
          sectionId: 'vocab-numbers',
          type: 'vocabulary-section',
          header: {
            title: 'VOCABULARY',
            subtitle: 'Numbers 1-20',
            color: 'teal'
          },
          exercises: [
            {
              exerciseId: 'ex-numbers-1',
              number: 3,
              type: 'listen-repeat',
              instruction: 'Listen and repeat.',
              audio: {
                trackNumber: '03',
                fileName: 'track03-numbers.mp3',
                baseUrl: '/audio/word-maps/prepare-2e-l1/sb/'
              },
              content: {
                type: 'number-grid',
                columns: 4,
                items: [
                  { number: 1, word: 'one' },
                  { number: 2, word: 'two' },
                  { number: 3, word: 'three' },
                  { number: 4, word: 'four' },
                  { number: 5, word: 'five' },
                  { number: 6, word: 'six' },
                  { number: 7, word: 'seven' },
                  { number: 8, word: 'eight' },
                  { number: 9, word: 'nine' },
                  { number: 10, word: 'ten' },
                  { number: 11, word: 'eleven' },
                  { number: 12, word: 'twelve' },
                  { number: 13, word: 'thirteen' },
                  { number: 14, word: 'fourteen' },
                  { number: 15, word: 'fifteen' },
                  { number: 16, word: 'sixteen' },
                  { number: 17, word: 'seventeen' },
                  { number: 18, word: 'eighteen' },
                  { number: 19, word: 'nineteen' },
                  { number: 20, word: 'twenty' }
                ]
              }
            },
            {
              exerciseId: 'ex-numbers-2',
              number: 4,
              type: 'match',
              instruction: 'Match the numbers with the words.',
              interactive: {
                type: 'matching',
                data: {
                  type: 'matching',
                  pairs: [
                    { left: '7', right: 'seven' },
                    { left: '15', right: 'fifteen' },
                    { left: '12', right: 'twelve' },
                    { left: '19', right: 'nineteen' },
                    { left: '20', right: 'twenty' }
                  ]
                }
              },
              content: {
                type: 'text',
                text: 'Draw lines to connect the numbers with their words.'
              }
            }
          ]
        }
      ]
    },
    // Page 2: Colors and Days
    {
      pageId: 'page-0-2',
      pageNumber: 2,
      layout: 'two-column',
      sections: [
        // Left column: Colors
        {
          sectionId: 'vocab-colors',
          type: 'vocabulary-section',
          header: {
            title: 'VOCABULARY',
            subtitle: 'Colours',
            color: 'blue'
          },
          exercises: [
            {
              exerciseId: 'ex-colors-1',
              number: 5,
              type: 'listen-repeat',
              instruction: 'Listen and repeat the colours.',
              audio: {
                trackNumber: '04',
                fileName: 'track04-colors.mp3',
                baseUrl: '/audio/word-maps/prepare-2e-l1/sb/'
              },
              content: {
                type: 'color-cakes',
                items: [
                  { color: 'red', hexCode: '#ef4444' },
                  { color: 'blue', hexCode: '#3b82f6' },
                  { color: 'green', hexCode: '#22c55e' },
                  { color: 'yellow', hexCode: '#eab308' },
                  { color: 'orange', hexCode: '#f97316' },
                  { color: 'purple', hexCode: '#a855f7' },
                  { color: 'pink', hexCode: '#ec4899' },
                  { color: 'black', hexCode: '#1f2937' },
                  { color: 'white', hexCode: '#f9fafb' },
                  { color: 'brown', hexCode: '#92400e' },
                  { color: 'grey', hexCode: '#6b7280' }
                ]
              }
            },
            {
              exerciseId: 'ex-colors-2',
              number: 6,
              type: 'fill-blank',
              instruction: 'Complete the sentences with colours.',
              interactive: {
                type: 'fill-blanks',
                data: {
                  type: 'fill-blanks',
                  sentences: [
                    { text: 'The sky is _____.', blanks: [{ position: 0, answer: 'blue', hint: 'b___' }] },
                    { text: 'Grass is _____.', blanks: [{ position: 0, answer: 'green', hint: 'g___' }] },
                    { text: 'The sun is _____.', blanks: [{ position: 0, answer: 'yellow', hint: 'y___' }] },
                    { text: 'A banana is _____.', blanks: [{ position: 0, answer: 'yellow', hint: 'y___' }] },
                    { text: 'Chocolate is _____.', blanks: [{ position: 0, answer: 'brown', hint: 'br___' }] }
                  ]
                }
              },
              content: {
                type: 'text',
                text: 'Write the correct colour word in each blank.'
              }
            }
          ]
        },
        // Right column: Days of the week
        {
          sectionId: 'vocab-days',
          type: 'vocabulary-section',
          header: {
            title: 'VOCABULARY',
            subtitle: 'Days of the week',
            color: 'orange'
          },
          exercises: [
            {
              exerciseId: 'ex-days-1',
              number: 7,
              type: 'listen-repeat',
              instruction: 'Listen and repeat the days of the week.',
              audio: {
                trackNumber: '05',
                fileName: 'track05-days.mp3',
                baseUrl: '/audio/word-maps/prepare-2e-l1/sb/'
              },
              content: {
                type: 'days-calendar',
                items: [
                  { day: 'Monday', abbreviation: 'Mon' },
                  { day: 'Tuesday', abbreviation: 'Tue' },
                  { day: 'Wednesday', abbreviation: 'Wed' },
                  { day: 'Thursday', abbreviation: 'Thu' },
                  { day: 'Friday', abbreviation: 'Fri' },
                  { day: 'Saturday', abbreviation: 'Sat' },
                  { day: 'Sunday', abbreviation: 'Sun' }
                ]
              }
            },
            {
              exerciseId: 'ex-days-2',
              number: 8,
              type: 'complete',
              instruction: 'Put the days in the correct order.',
              interactive: {
                type: 'ordering',
                data: {
                  type: 'ordering',
                  items: ['Wednesday', 'Monday', 'Friday', 'Tuesday', 'Sunday', 'Thursday', 'Saturday'],
                  correctOrder: [1, 3, 0, 5, 2, 6, 4]
                }
              },
              content: {
                type: 'text',
                text: 'Drag and drop to arrange the days starting from Monday.'
              }
            }
          ]
        }
      ]
    },
    // Page 3: Speaking - Greetings
    {
      pageId: 'page-0-3',
      pageNumber: 3,
      layout: 'single',
      sections: [
        {
          sectionId: 'speaking-greetings',
          type: 'speaking-section',
          header: {
            title: 'SPEAKING',
            subtitle: 'Greetings',
            color: 'green'
          },
          exercises: [
            {
              exerciseId: 'ex-greetings-1',
              number: 9,
              type: 'listen-repeat',
              instruction: 'Listen and read the dialogue.',
              audio: {
                trackNumber: '06',
                fileName: 'track06-greetings.mp3',
                baseUrl: '/audio/word-maps/prepare-2e-l1/sb/'
              },
              content: {
                type: 'dialogue',
                lines: [
                  { speaker: 'A', text: 'Hello! My name is Emma. What\'s your name?' },
                  { speaker: 'B', text: 'Hi! I\'m Tom. Nice to meet you!' },
                  { speaker: 'A', text: 'Nice to meet you too! How are you?' },
                  { speaker: 'B', text: 'I\'m fine, thanks. And you?' },
                  { speaker: 'A', text: 'I\'m good, thank you!' }
                ]
              }
            },
            {
              exerciseId: 'ex-greetings-2',
              number: 10,
              type: 'role-play',
              instruction: 'Practice the dialogue with a partner.',
              interactive: {
                type: 'fill-blanks',
                data: {
                  type: 'fill-blanks',
                  sentences: [
                    { text: 'A: Hello! My _____ is [your name]. What\'s your _____?', blanks: [{ position: 0, answer: 'name' }, { position: 1, answer: 'name' }] },
                    { text: 'B: Hi! I\'m [partner name]. _____ to meet you!', blanks: [{ position: 0, answer: 'Nice' }] },
                    { text: 'A: Nice to meet you _____! How _____ you?', blanks: [{ position: 0, answer: 'too' }, { position: 1, answer: 'are' }] },
                    { text: 'B: I\'m _____, thanks. And _____?', blanks: [{ position: 0, answer: 'fine' }, { position: 1, answer: 'you' }] }
                  ]
                }
              },
              content: {
                type: 'text',
                text: 'Complete the dialogue with the correct words, then practice with your partner.'
              }
            }
          ]
        }
      ]
    }
  ]
};
