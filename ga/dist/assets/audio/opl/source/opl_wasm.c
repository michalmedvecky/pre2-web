/* Browser engine only: unmodified Nuked-OPL3, no DOS/EXE interpreter. */
#include <stdint.h>
#include <stddef.h>
#include "opl3.h"
static opl3_chip chip;
static int16_t output[512];
/* Avoid WASI/libc imports; preserve the vendor source unchanged. */
void *memset(void *target,int value,size_t count){unsigned char *p=target;for(size_t i=0;i<count;i++)p[i]=(unsigned char)value;return target;}
void opl_reset(uint32_t rate){OPL3_Reset(&chip,rate);}
void opl_write(uint32_t reg,uint32_t value){OPL3_WriteReg(&chip,(uint16_t)reg,(uint8_t)value);}
uint32_t opl_buffer(void){return (uint32_t)(uintptr_t)output;}
uint32_t opl_chip_size(void){return sizeof(chip);}
uint32_t opl_render(uint32_t count){if(count>512)count=512;int16_t sample[2];for(uint32_t i=0;i<count;i++){OPL3_GenerateResampled(&chip,sample);output[i]=sample[0];}return count;}
