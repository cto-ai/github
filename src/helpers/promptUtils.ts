import { Question, Questions, ux } from '@cto.ai/sdk';

//This re-prompts user until their answer passes validation
//validate takes in the return value of ux.prompt, and forces re-prompt if it returns false
//errorMessage is displayed to user when validation fails
export const validatedPrompt = async (prompt: Question | Questions, validate: (response: any) => boolean, errorMessage: string) => {
    let response: any
    let repeatedPrompt = false
    do {
        if (repeatedPrompt) {
            await ux.print(errorMessage)
        }
        response = await ux.prompt(prompt)
        repeatedPrompt = true
    } while (!validate(response));
    return response
}

export const keyValPrompt = async (prompt: Question, choices: { name: string, value: any }[]) => {
    //TODO: more specific question type
    //TODO: handle question that only returns 1 val / question that returns 0 or more val
    const nameList: string[] = choices.map((value) => { return value.name })
    let filledPrompt = prompt
    filledPrompt['choices'] = nameList
    const resp = await ux.prompt(prompt)

}