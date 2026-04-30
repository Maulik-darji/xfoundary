export const getBatch = (date = new Date()) => {
    const month = date.getMonth(); // 0-11
    const year = date.getFullYear();
    
    let season = '';
    
    if ([11, 0, 1, 10].includes(month)) { // Dec, Jan, Feb, Nov
        season = 'WINTER';
    } else if ([2, 3].includes(month)) { // Mar, Apr
        season = 'SPRING';
    } else if ([4, 5].includes(month)) { // May, Jun
        season = 'SUMMER';
    } else if ([6, 7, 8, 9].includes(month)) { // Jul, Aug, Sep, Oct
        season = 'RAINY (MONSOON)';
    }
    
    return `${season} ${year}`;
};
