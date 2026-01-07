# SQKhor Pixel Icons Documentation

> **Source**: https://sqkhor.com/pixel-icons/
> **GitHub**: https://github.com/shuqikhor/pixel-icons
> **Total Icons**: 357 icons in 9x9 pixel grid

## Quick Start

```html
<!-- Basic usage -->
<i class="sq sq-heart"></i>

<!-- With size -->
<i class="sq sq-star sq-lg"></i>

<!-- With color -->
<i class="sq sq-coin sq-gold"></i>

<!-- With animation -->
<i class="sq sq-sparkles sq-pulse"></i>
```

---

## Size Classes

| Class | Size | Use Case |
|-------|------|----------|
| `sq-xs` | 12px | Inline text, badges |
| `sq-sm` | 16px | Small buttons |
| `sq-md` | 18px | Default size |
| `sq-lg` | 24px | Prominent icons |
| `sq-xl` | 32px | Headers, cards |
| `sq-2xl` | 40px | Large displays |
| `sq-3xl` | 48px | Hero sections |
| `sq-4xl` | 64px | Empty states |

---

## Color Classes

| Class | Color | CSS Filter Applied |
|-------|-------|-------------------|
| `sq-red` | Red | For hearts, errors |
| `sq-orange` | Orange | Warnings |
| `sq-yellow` | Yellow | Stars, highlights |
| `sq-gold` | Gold | Coins, premium |
| `sq-green` | Green | Success, health |
| `sq-teal` | Teal | Info |
| `sq-blue` | Blue | Water, links |
| `sq-purple` | Purple | Gems, rare items |
| `sq-pink` | Pink | Love, special |
| `sq-gray` | Gray | Disabled |
| `sq-white` | White | On dark backgrounds |

---

## Animation Classes

| Class | Effect | Use Case |
|-------|--------|----------|
| `sq-spin` | 360° rotation | Loading |
| `sq-pulse` | Scale + opacity | Notification |
| `sq-bounce` | Vertical bounce | Attention |
| `sq-shake` | Horizontal shake | Error |

---

## Transform Classes

| Class | Effect |
|-------|--------|
| `sq-flip-h` | Flip horizontally |
| `sq-flip-v` | Flip vertically |
| `sq-rotate-90` | Rotate 90° |
| `sq-rotate-180` | Rotate 180° |
| `sq-rotate-270` | Rotate 270° |

---

## Hover Classes

| Class | Effect |
|-------|--------|
| `sq-hover-grow` | Scale to 1.2x on hover |
| `sq-hover-bounce` | Bounce animation on hover |

---

## Icon Categories

### 🎮 Game Elements (Primary for ChatLingua)

| Icon | Class | Alias | Description |
|------|-------|-------|-------------|
| ❤️ | `sq-heart` | - | Health, lives, love |
| ⭐ | `sq-star` | - | Rating, achievement |
| ⭐ | `sq-star-empty` | - | Empty star |
| ⭐ | `sq-star-half` | - | Half star |
| 🔥 | `sq-fire` | - | Streak, hot |
| ⚡ | `sq-lightning` | `sq-bolt`, `sq-energy` | Energy, power |
| ✨ | `sq-sparkles` | `sq-gem` | Magic, gems |
| 💵 | `sq-dollar` | `sq-coin` | Currency |
| 🎁 | `sq-gift` | - | Rewards, gifts |
| 🏆 | `sq-ribbon` | `sq-trophy` | Achievement |
| 🚀 | `sq-rocket` | - | Boost, launch |
| 🎮 | `sq-game-controller` | - | Games |

```html
<!-- Pet stats example -->
<div class="flex gap-2">
  <i class="sq sq-heart sq-red"></i>
  <i class="sq sq-bolt sq-yellow"></i>
  <i class="sq sq-star sq-gold"></i>
</div>

<!-- Currency display -->
<span class="flex items-center gap-1">
  <i class="sq sq-coin sq-gold"></i>
  <span>1,000</span>
</span>
```

---

### 🐾 Animals (Pets)

#### Cats
| Icon | Class | Description |
|------|-------|-------------|
| 🐱 | `sq-cat` | Default cat |
| 🐱 | `sq-cat-sit` | Sitting cat |
| ⬛ | `sq-cat-black` | Black cat |
| 🐱 | `sq-cat-calico` | Calico cat |
| 🐱 | `sq-cat-grey` | Grey cat |
| 🐱 | `sq-cat-orange` | Orange cat |
| 🐱 | `sq-cat-tabby` | Tabby cat |
| 🐱 | `sq-cat-white` | White cat |

#### Dogs
| Icon | Class | Description |
|------|-------|-------------|
| 🐕 | `sq-dog` | Default dog |
| 🐕 | `sq-dog-beagle` | Beagle |
| 🐕 | `sq-dog-shiba` | Shiba Inu |

#### Other Animals
| Icon | Class | Description |
|------|-------|-------------|
| 🐻 | `sq-bear` | Bear |
| 🐼 | `sq-panda` | Panda |
| 🐧 | `sq-penguin` | Penguin |
| 🦊 | `sq-fox` | Fox |
| 🐰 | `sq-rabbit` | White rabbit |
| 🐰 | `sq-rabbit-grey` | Grey rabbit |
| 🦉 | `sq-owl` | Owl |
| 🐸 | `sq-frog` | Frog |
| 🐷 | `sq-pig` | Pig |
| 🐮 | `sq-cow` | Cow |
| 🐑 | `sq-sheep` | Sheep |
| 🐴 | `sq-horse` | Horse |
| 🐘 | `sq-elephant` | Elephant |
| 🦁 | `sq-lion` | Lion |
| 🐯 | `sq-tiger` | Tiger |
| 🐵 | `sq-monkey` | Monkey |
| 🐨 | `sq-koala` | Koala |
| 🦥 | `sq-sloth` | Sloth |
| 🐋 | `sq-whale` | Whale |
| 🐬 | `sq-dolphin` | Dolphin |
| 🐟 | `sq-fish` | Fish |
| 🦀 | `sq-crab` | Crab |
| 🐝 | `sq-bee` | Bee |
| 🐿️ | `sq-squirrel` | Squirrel |
| 🦝 | `sq-raccoon` | Raccoon |
| 🦙 | `sq-alpaca` | Alpaca |
| 🦫 | `sq-capybara` | Capybara |
| 🦄 | `sq-unicorn` | Unicorn |
| 🐢 | `sq-tortoise` | Tortoise |
| 🦆 | `sq-duck` | Duck |
| 🛁 | `sq-rubber-duck` | Rubber duck |

#### Dinosaurs
| Icon | Class |
|------|-------|
| 🦕 | `sq-sauropod` |
| 🦖 | `sq-stegosaurus` |
| 🦖 | `sq-triceratops` |
| 🦖 | `sq-t-rex` |

---

### 🎮 Pokémon & Game Characters

| Icon | Class | Description |
|------|-------|-------------|
| ⚡ | `sq-pikachu` | Pikachu |
| ⚡ | `sq-pichu` | Pichu |
| 🦊 | `sq-eevee` | Eevee |
| 🌱 | `sq-bulbasaur` | Bulbasaur |
| 🔥 | `sq-charmander` | Charmander |
| 💧 | `sq-squirtle` | Squirtle |
| 🎤 | `sq-jigglypuff` | Jigglypuff |
| 😺 | `sq-meowth` | Meowth |
| 🦆 | `sq-psyduck` | Psyduck |
| 😴 | `sq-slowpoke` | Slowpoke |
| 🐟 | `sq-magikarp` | Magikarp |
| 🐢 | `sq-lapras` | Lapras |
| 💗 | `sq-chansey` | Chansey |
| 🕳️ | `sq-diglett` | Diglett |
| 🌿 | `sq-chikorita` | Chikorita |
| 🔥 | `sq-cyndaquil` | Cyndaquil |
| 💧 | `sq-totodile` | Totodile |
| 🐧 | `sq-piplup` | Piplup |
| 🍄 | `sq-mario` | Mario |
| 🍄 | `sq-mario-jump` | Mario jumping |
| 👻 | `sq-pacman` | Pac-Man |
| 👻 | `sq-ghost` | Ghost |
| 👻 | `sq-ghost-blue` | Blue ghost |
| 👻 | `sq-ghost-orange` | Orange ghost |
| 👻 | `sq-ghost-pink` | Pink ghost |
| 👻 | `sq-ghost-red` | Red ghost |
| 🌈 | `sq-nyan-cat` | Nyan Cat |

---

### 🍎 Food & Drinks

#### Fruits & Vegetables
| Icon | Class |
|------|-------|
| 🍎 | `sq-apple` |
| 🍌 | `sq-banana` |
| 🥕 | `sq-carrot` |
| 🍒 | `sq-cherry` |
| 🍇 | `sq-grapes` |
| 🍋 | `sq-lemon` |
| 🥭 | `sq-mango` |
| 🍐 | `sq-pear` |
| 🍍 | `sq-pineapple` |
| 🍓 | `sq-strawberry` |
| 🍉 | `sq-watermelon` |
| 🥑 | `sq-avocado` |
| 🥦 | `sq-broccoli` |
| 🍅 | `sq-tomato` |
| 🥚 | `sq-egg` |
| 🍄 | `sq-mushroom` |

#### Sweets & Desserts
| Icon | Class |
|------|-------|
| 🍪 | `sq-cookie` |
| 🎂 | `sq-cake` |
| 🍰 | `sq-shortcake` |
| 🍩 | `sq-doughnut` |
| 🍬 | `sq-candy` |
| 🍭 | `sq-lollipop` |
| 🍦 | `sq-ice-cream` |
| 🍨 | `sq-ice-cream-bowl` |
| 🧇 | `sq-waffle` |
| 🥞 | `sq-pancakes` |

#### Meals
| Icon | Class |
|------|-------|
| 🍞 | `sq-bread` |
| 🍚 | `sq-rice` |
| 🍕 | `sq-pizza` |
| 🍔 | `sq-burger` |
| 🍟 | `sq-fries` |
| 🥪 | `sq-sandwich` |
| 🥐 | `sq-croissant` |
| 🥨 | `sq-pretzel` |
| 🍿 | `sq-popcorn` |
| 🍜 | `sq-noodles` |
| 🍙 | `sq-onigiri` |

#### Drinks
| Icon | Class |
|------|-------|
| ☕ | `sq-coffee` |
| 🍺 | `sq-beer` |
| 🍷 | `sq-wine` |
| 🧋 | `sq-bubble-tea` |

---

### 🎯 UI & Navigation

#### Arrows
| Icon | Class | Alias |
|------|-------|-------|
| ⬆️ | `sq-arrow-up` | - |
| ⬇️ | `sq-arrow-down` | - |
| ⬅️ | `sq-arrow-left` | - |
| ➡️ | `sq-arrow-right` | - |
| 🔼 | `sq-caret-up` | - |
| 🔽 | `sq-caret-down` | - |
| ◀️ | `sq-caret-left` | - |
| ▶️ | `sq-caret-right` | - |

#### Actions
| Icon | Class | Alias |
|------|-------|-------|
| 🔍 | `sq-magnifier` | `sq-search` |
| 🔍 | `sq-zoom-in` | - |
| 🔍 | `sq-zoom-out` | - |
| ✏️ | `sq-edit` | - |
| ✏️ | `sq-pencil` | - |
| 📋 | `sq-copy` | - |
| 📋 | `sq-paste` | - |
| 💾 | `sq-save` | - |
| 📤 | `sq-export` | - |
| 🗑️ | `sq-bin` | `sq-trash` |
| ✂️ | `sq-scissors` | - |
| 🔧 | `sq-wrench` | - |
| ⚙️ | `sq-gear` | `sq-settings` |
| ❌ | `sq-x` | `sq-close` |
| ☰ | `sq-burger-menu` | `sq-menu` |

#### Status & Alerts
| Icon | Class |
|------|-------|
| ⚠️ | `sq-alert-circle` |
| ⚠️ | `sq-alert-triangle` |
| 🔔 | `sq-bell` |
| 🔒 | `sq-lock` |
| 🔓 | `sq-unlock` |
| 🔑 | `sq-key` |

#### Text Alignment
| Icon | Class |
|------|-------|
| 📝 | `sq-align-left` |
| 📝 | `sq-align-center` |
| 📝 | `sq-align-right` |
| 📝 | `sq-align-justify` |

---

### 👤 User & Communication

| Icon | Class | Alias |
|------|-------|-------|
| 👤 | `sq-user` | - |
| 👥 | `sq-users` | - |
| 💬 | `sq-message` | - |
| 💬 | `sq-messages` | - |
| 💬 | `sq-message-typing` | - |
| ✉️ | `sq-mail` | - |
| ✉️ | `sq-mail-open` | - |
| 📫 | `sq-mailbox` | - |
| 📥 | `sq-inbox` | - |
| 📤 | `sq-outbox` | - |
| 📱 | `sq-phone` | - |
| 🎤 | `sq-microphone` | - |
| 🎧 | `sq-headphones` | - |

---

### 📁 Files & Documents

| Icon | Class |
|------|-------|
| 📄 | `sq-file` |
| 📄 | `sq-file-text` |
| 🖼️ | `sq-file-picture` |
| 📁 | `sq-folder` |
| 📋 | `sq-clipboard` |
| 📖 | `sq-book` |
| 🔖 | `sq-bookmark` |
| 🖼️ | `sq-photo` |
| 🖼️ | `sq-picture` |
| 📷 | `sq-camera` |
| 📷 | `sq-camera-polaroid` |

---

### ⏰ Time & Calendar

| Icon | Class |
|------|-------|
| 🕐 | `sq-clock` |
| 📅 | `sq-calendar` |

---

### 🛒 Shopping & Commerce

| Icon | Class |
|------|-------|
| 🛒 | `sq-cart` |
| 🧺 | `sq-basket` |
| 🏪 | `sq-shop` |
| 💳 | `sq-credit-card` |
| 📦 | `sq-box` |
| 🛍️ | `sq-paper-bag` |
| 💼 | `sq-briefcase` |
| 🧳 | `sq-luggage` |

---

### 🚗 Transport

| Icon | Class |
|------|-------|
| 🚗 | `sq-car` |
| 🚌 | `sq-bus` |
| 🚚 | `sq-truck` |
| 🚚 | `sq-truck-fast` |
| 🚚 | `sq-delivery` |
| 🛵 | `sq-scooter` |
| ✈️ | `sq-plane` |
| 🚁 | `sq-helicopter` |
| 🚢 | `sq-ship` |
| 🛥️ | `sq-yacht` |
| 🚇 | `sq-submarine` |
| 🚂 | `sq-locomotive` |
| 🚒 | `sq-fire-engine` |
| 🚗 | `sq-convertible` |

---

### 💻 Devices

| Icon | Class |
|------|-------|
| 🖥️ | `sq-computer` |
| 💻 | `sq-laptop` |
| 📱 | `sq-smartphone` |
| 📱 | `sq-tablet` |
| 🖨️ | `sq-printer` |
| 🧮 | `sq-calculator` |
| 🎛️ | `sq-control-panel` |
| 🪟 | `sq-window-ui` |

---

### 🔋 Power & Battery

| Icon | Class | Alias |
|------|-------|-------|
| 🔋 | `sq-battery-1` | `sq-battery-empty` |
| 🔋 | `sq-battery-2` | - |
| 🔋 | `sq-battery-3` | - |
| 🔋 | `sq-battery-4` | - |
| 🔋 | `sq-battery-5` | - |
| 🔋 | `sq-battery-6` | `sq-battery-full` |
| 💡 | `sq-light-bulb` | - |
| 💡 | `sq-light-bulb-on` | - |
| 💡 | `sq-light-bulb-off` | - |

---

### 🔊 Audio & Music

| Icon | Class |
|------|-------|
| 🎵 | `sq-music` |
| 🎸 | `sq-guitar` |
| 🎸 | `sq-electric-guitar` |
| 🔊 | `sq-sound-high` |
| 🔉 | `sq-sound-low` |
| 🔇 | `sq-sound-mute` |

---

### 🌤️ Nature & Weather

| Icon | Class |
|------|-------|
| ☀️ | `sq-sun` |
| 🌙 | `sq-moon` |
| ☁️ | `sq-cloud` |
| 🌧️ | `sq-rain` |
| ❄️ | `sq-snow` |
| 💨 | `sq-wind` |
| 🌈 | `sq-rainbow` |
| ☂️ | `sq-umbrella` |
| 🌍 | `sq-earth` |
| 🌹 | `sq-rose` |
| 🌸 | `sq-sakura` |
| 🌸 | `sq-sakura-tree` |
| 🌳 | `sq-apple-tree` |
| 🎄 | `sq-christmas-tree` |
| 🗻 | `sq-mount-fuji` |
| 🎃 | `sq-pumpkin` |

---

### 📱 Social Media & Brands

| Icon | Class |
|------|-------|
| 🐙 | `sq-github` |
| 🐦 | `sq-twitter` |
| 📘 | `sq-facebook` |
| 📷 | `sq-instagram` |
| ▶️ | `sq-youtube` |
| 🎵 | `sq-tiktok` |
| 💼 | `sq-linkedin` |
| 🤖 | `sq-reddit` |
| 🎵 | `sq-spotify` |
| 🔍 | `sq-google` |
| 🌐 | `sq-chrome` |
| 🦊 | `sq-firefox` |
| 🧭 | `sq-safari` |
| 🌐 | `sq-edge` |
| 🐳 | `sq-docker` |
| 🎨 | `sq-figma` |
| 📝 | `sq-notion` |
| 🎨 | `sq-photoshop` |
| 🎨 | `sq-illustrator` |
| 🤖 | `sq-chatgpt` |
| 🤖 | `sq-claude` |
| 🤖 | `sq-gemini` |
| 💰 | `sq-paypal` |
| 🧵 | `sq-threads` |
| 🗺️ | `sq-waze` |
| 🪟 | `sq-windows` |
| 🍎 | `sq-apple-logo` |
| 🗺️ | `sq-google-maps` |

---

### 🎄 Christmas & Holidays

| Icon | Class |
|------|-------|
| 🎅 | `sq-santa` |
| 🎅 | `sq-santa-face` |
| ⛄ | `sq-snowman` |
| 🧑‍🎄 | `sq-gingerbread-man` |
| 🦌 | `sq-rudolph` |
| 🎄 | `sq-wreath` |
| 🔔 | `sq-xmas-bell` |
| 🧦 | `sq-xmas-stocking` |
| 🎄 | `sq-mistletoe` |
| 🍬 | `sq-candycane` |

---

### 😂 Memes & Fun

| Icon | Class | Description |
|------|-------|-------------|
| 😮 | `sq-surprised-pikachu` | Surprised Pikachu meme |
| 🔥 | `sq-this-is-fine` | This is fine meme |
| 🐸 | `sq-sad-pepe` | Sad Pepe |
| 💸 | `sq-take-my-money` | Take my money meme |
| 🎵 | `sq-rickroll` | Rick Roll |
| 🕷️ | `sq-spooderman` | Spooderman |
| 📈 | `sq-stonks` | Stonks meme |
| 🌈 | `sq-nyan-cat` | Nyan Cat |
| 💃 | `sq-dancing-man` | Dancing man |
| 💃 | `sq-dancing-woman` | Dancing woman |
| 👍 | `sq-thumb-up` | Thumbs up |
| 👎 | `sq-thumb-down` | Thumbs down |
| 🐱 | `sq-maneki-neko` | Lucky cat |
| 🎉 | `sq-pinata` | Pinata |
| 🪩 | `sq-mirror-ball` | Disco ball |

---

## Usage Examples

### Pet Stats Bar
```html
<div class="flex items-center gap-4 p-4 bg-white rounded-lg">
  <!-- Health -->
  <div class="flex items-center gap-1">
    <i class="sq sq-heart sq-red sq-lg"></i>
    <span class="font-bold">85/100</span>
  </div>

  <!-- Energy -->
  <div class="flex items-center gap-1">
    <i class="sq sq-bolt sq-yellow sq-lg"></i>
    <span class="font-bold">60/100</span>
  </div>

  <!-- Happiness -->
  <div class="flex items-center gap-1">
    <i class="sq sq-star sq-gold sq-lg"></i>
    <span class="font-bold">90/100</span>
  </div>
</div>
```

### Currency Display
```html
<div class="flex items-center gap-4">
  <!-- Coins -->
  <div class="flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-full">
    <i class="sq sq-coin sq-gold"></i>
    <span class="font-bold">1,234</span>
  </div>

  <!-- Gems -->
  <div class="flex items-center gap-1 bg-purple-50 px-3 py-1 rounded-full">
    <i class="sq sq-gem sq-purple"></i>
    <span class="font-bold">56</span>
  </div>
</div>
```

### Loading State
```html
<div class="flex items-center gap-2">
  <i class="sq sq-star sq-spin sq-gold"></i>
  <span>Loading...</span>
</div>
```

### Achievement Badge
```html
<div class="flex items-center gap-2 bg-gradient-to-r from-yellow-100 to-orange-100 px-4 py-2 rounded-full">
  <i class="sq sq-trophy sq-gold sq-bounce"></i>
  <span class="font-bold">First Win!</span>
</div>
```

### Pet Card
```html
<div class="bg-white rounded-xl p-4 shadow-md">
  <div class="flex items-center gap-3">
    <i class="sq sq-cat-orange sq-3xl"></i>
    <div>
      <h3 class="font-bold">Whiskers</h3>
      <div class="flex gap-2 text-sm">
        <span class="flex items-center gap-1">
          <i class="sq sq-heart sq-red sq-sm"></i> 95
        </span>
        <span class="flex items-center gap-1">
          <i class="sq sq-star sq-gold sq-sm"></i> Lv.5
        </span>
      </div>
    </div>
  </div>
</div>
```

### Food Menu
```html
<div class="grid grid-cols-4 gap-2">
  <button class="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 flex flex-col items-center">
    <i class="sq sq-apple sq-xl sq-hover-bounce"></i>
    <span class="text-xs mt-1">Apple</span>
  </button>
  <button class="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 flex flex-col items-center">
    <i class="sq sq-cookie sq-xl sq-hover-bounce"></i>
    <span class="text-xs mt-1">Cookie</span>
  </button>
  <button class="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 flex flex-col items-center">
    <i class="sq sq-cake sq-xl sq-hover-bounce"></i>
    <span class="text-xs mt-1">Cake</span>
  </button>
  <button class="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 flex flex-col items-center">
    <i class="sq sq-candy sq-xl sq-hover-bounce"></i>
    <span class="text-xs mt-1">Candy</span>
  </button>
</div>
```

---

## Combining with Tailwind CSS

```html
<!-- Responsive sizes -->
<i class="sq sq-heart sq-sm md:sq-md lg:sq-lg"></i>

<!-- Conditional colors -->
<i class="sq sq-heart"
   [class.sq-red]="health < 30"
   [class.sq-green]="health >= 70">
</i>

<!-- Button with icon -->
<button class="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg">
  <i class="sq sq-cart sq-white"></i>
  <span>Add to Cart</span>
</button>
```

---

## Notes

- All icons are **9x9 pixel grid** SVGs
- Default render size is **18px** (2x for clarity)
- Use `image-rendering: pixelated` is applied for crisp edges
- Colors are applied via CSS filters (works with any SVG color)
- Original icons are black - use color classes to change
