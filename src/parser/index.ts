import 'dotenv/config'

if (!process.env.DB_FILE_NAME) {
    throw new Error("Environment variable DB_FILE_NAME is not defined")
}

abstract class Maybe<T> {
    abstract bind<U>(func: (value: T) => Maybe<U>): Maybe<U>
}

class Just<T> extends Maybe<T> {
    constructor(private value: T) {
        super()
    }

    bind<U>(func: (value: T) => Maybe<U>): Maybe<U> {
        return func(this.value)
    }
}


class Nothing<T> extends Maybe<T> {
    bind<U>(func: (value: T) => Maybe<U>): Maybe<U> {
        return new Nothing<U>()
    }
}

type AnyObject = { [key: string]: any }

const prop = <T extends AnyObject, K extends keyof T>(
    p: K
) => (obj: T | undefined): Maybe<T[K]> => {
    
    if (p !== undefined && obj !== undefined) {
        return new Just(obj[p])
    }
    return new Nothing()
}

type O = {
    x?: {
        z?: {
            y?: { 
                w: string 
            }
        }
    }
    m: {
        a: number
    }
}

const objExample: O = {
    x: {
        z: {
            y: {
                w: "wow"
            },
        },
    },
    m: {
        a: 3,
    },
}

// Example usage
const inputMaybe = new Just(objExample)

const result = inputMaybe
    .bind(prop('x'))
    .bind(prop('z'))
    .bind(prop('y'))
    .bind(prop('w'))

console.log(result)