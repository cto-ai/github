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