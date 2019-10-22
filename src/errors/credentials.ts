import { CREDS_ERROR_MSG } from './constants'
export class CredentialsError extends Error {
  constructor() {
    super(CREDS_ERROR_MSG)
  }
}
