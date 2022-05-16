const { library, icon, findIconDefinition } = require('@fortawesome/fontawesome-svg-core')
const { fas } = require('@fortawesome/free-solid-svg-icons')

library.add(fas)

const drawFontAwesomeIcon = (ctx, iconName, x, y, size, color = 'white', prefix = 'fas') => {
    let def = findIconDefinition({ prefix, iconName})
    if (!def) return
    let icn = icon(def)
    ctx.fillStyle = color
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(size, size)
    ctx.fill(new Path2D(icn.icon[4]))
    ctx.restore()
}

const handleDrawTitleBox = (ctx, titleHeight, scale) => {
    if (!this.iconName) return
    if (scale > 0.5) drawFontAwesomeIcon(ctx, this.iconName, 4, -titleHeight + 4, 0.025, this.iconColor || 'white', this.iconPrefix || 'fas')
}

module.exports = { drawFontAwesomeIcon, handleDrawTitleBox }