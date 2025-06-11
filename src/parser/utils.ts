export function parseChildXmlElement(
    element: any,
    onParse: (child: any, index: number) => void,
    count : number = 0
) : number
{
    if (element === undefined) return count;
    if (element === null) return count;
    
    if (Array.isArray(element)) {
        element.forEach((child: any) => {
            count = parseChildXmlElement(child, onParse, count);
        });
    }
    else {
        onParse(element, count++);
    }

    return count;
}