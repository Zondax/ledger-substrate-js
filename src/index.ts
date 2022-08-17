#!/usr/bin/env ts-node

/** ******************************************************************************
 *  (c) 2019 - 2022 ZondaX AG
 *  (c) 2016-2017 Ledger
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 ******************************************************************************* */

import chalk from 'chalk'
import minimist from 'minimist'
import figlet from 'figlet'

import { printSupported } from './cmd/cli'

async function main(): Promise<any> {
  const args = minimist(process.argv.slice(2))
  const cmd = args._[0]
  let chain = args._[1]

  if (chain) {
    chain = chain.toLowerCase()
    console.log(chalk.green(figlet.textSync(`${chain}`, { horizontalLayout: 'full' })))
  }

  if (cmd === 'supported') return printSupported()
  else return `"${cmd}" is not a valid command!`
}

;(async () => {
  const response = await main()
  if (response) {
    console.log(response)
  }
})()
  .catch(e => {
    console.log(chalk.bgRed(e.message))
    console.log(chalk.bgRed(e.stack))
  })
  .then(() => {
    process.exit()
  })
