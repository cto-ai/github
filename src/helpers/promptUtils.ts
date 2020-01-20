import { Question, Questions, ux } from '@cto.ai/sdk'

//This re-prompts user until their answer passes validation
//validate takes in the return value of ux.prompt, and forces re-prompt if it returns false
//errorMessage is displayed to user when validation fails
export const validatedPrompt = async (
  prompt: Question | Questions,
  validate: (response: any) => boolean,
  errorMessage?: string,
) => {
  let response: any
  let repeatedPrompt = false
  //keep asking as long as validation fails
  do {
    if (repeatedPrompt && errorMessage) {
      //not our first prompt
      //must have errored, so print the error message
      await ux.print(errorMessage)
    }
    response = await ux.prompt(prompt)
    repeatedPrompt = true
  } while (!validate(response))
  return response
}

//this replicates the SDK 1.x functionality,
//where you can have a separate display name and actual value returned
//prompt should be a ListQuestion, AutoCompleteQuestion, CheckboxQuestion
//name must be unique, as it is used as a key
//having duplicate names causes undefined behaviour (probably just returns one of the matching at random)
//prompt.choices will be overwritten, so feel free to set it to anything
export const keyValPrompt: (prompt: Question, choices: { name: string; value: any;}[]) => Promise<{[x: string]: any;}> = async (
  prompt: Question,
  choices: { name: string; value: any }[],
) => {
  const { name, type } = prompt
  //the ListQuestion interface is not actually exported
  if (!['list', 'autocomplete', 'checkbox'].includes(name)) {
    throw `prompt must be one of [list, autocomplete, checkbox], but got ${name}!`
  }

  let choicesArr: string[] = new Array(choices.length)
  let keyValMap: Map<string, any> = new Map()
  for (let index = 0; index < choices.length; index++) {
    //iterate through choices, getting an array of names
    //and a key-value map
    const element = choices[index]
    choicesArr[index] = element.name
    keyValMap.set(element.name, element.value)
  }

  //have the user select the key(s)...
  const resp = await ux.prompt(Object.assign(prompt, { choices: choicesArr }))
  if (resp[name]) {
    //and return the associated value(s)
    if (type == 'checkbox') {
      //multiple values
      return {
        [name]: resp[name].map((currentValue: string) => {
          keyValMap.get(currentValue)
        }),
      }
    } else {
      //single value
      return { [name]: keyValMap.get(resp[name]) }
    }
  } else {
    throw 'keyValPrompt: Failed to get the value associated with the key'
  }
}
